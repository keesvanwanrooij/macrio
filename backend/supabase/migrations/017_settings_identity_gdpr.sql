/*
 * SECTION: v0.3.0 — date format preference + GDPR soft-delete / export / purge
 * WHAT: Profile date_format; soft-delete with 30-day grace; export_my_data RPC; purge job helper.
 * HOW:
 *   1) Add profiles.date_format + profiles.deletion_requested_at
 *   2) Protect deletion_requested_at from client clears (local GUC gate)
 *   3) Replace delete_account() → mark + ban auth user (immediate lockout)
 *   4) export_my_data() returns JSON of personal rows
 *   5) purge_due_deleted_accounts() hard-deletes auth users past grace (anonymizes community via SET NULL)
 * INPUT: authenticated caller (delete/export); service_role / edge cron (purge)
 * OUTPUT: columns + RPCs; schedule edge function purge-deleted-accounts daily (see SETUP.md)
 */

-- ============================================================
-- PROFILE: date format preference
-- ============================================================
alter table public.profiles
  add column if not exists date_format text not null default 'DD-MM-YYYY';

alter table public.profiles drop constraint if exists profiles_date_format_check;
alter table public.profiles
  add constraint profiles_date_format_check
  check (date_format in ('DD-MM-YYYY', 'YYYY-MM-DD', 'MM-DD-YYYY'));

comment on column public.profiles.date_format is
  'Display preference for dates in the app. Storage remains ISO YYYY-MM-DD.';

-- ============================================================
-- PROFILE: soft-delete / grace period
-- ============================================================
alter table public.profiles
  add column if not exists deletion_requested_at timestamptz null;

comment on column public.profiles.deletion_requested_at is
  'When set, account is pending purge (30-day grace). Auth user is banned immediately.';

create index if not exists profiles_deletion_requested_at_idx
  on public.profiles (deletion_requested_at)
  where deletion_requested_at is not null;

/*
 * SECTION: Protect deletion_requested_at
 * WHAT: Clients cannot set/clear the grace marker; only security-definer RPCs that set macrio.allow_deletion_mark=on.
 * HOW: BEFORE UPDATE trigger compares old/new; raises unless local GUC is on.
 * INPUT: profiles row update
 * OUTPUT: allows or rejects the change
 */
create or replace function public.profiles_protect_deletion_requested_at()
returns trigger
language plpgsql
as $$
begin
  if new.deletion_requested_at is distinct from old.deletion_requested_at then
    if current_setting('macrio.allow_deletion_mark', true) is distinct from 'on' then
      raise exception 'deletion_requested_at is read-only';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_deletion_requested_at on public.profiles;
create trigger profiles_protect_deletion_requested_at
  before update on public.profiles
  for each row
  execute function public.profiles_protect_deletion_requested_at();

/*
 * SECTION: Soft-delete account (immediate lockout)
 * WHAT: Marks profile for purge in 30 days and bans the auth user so sign-in fails now.
 * HOW: 1) set GUC 2) set deletion_requested_at 3) ban auth.users 4) drop refresh tokens
 * INPUT: auth.uid()
 * OUTPUT: void; caller should signOut locally
 *
 * Replaces the old hard-delete delete_account() from 001_init.sql.
 * Community products stay; created_by/edited_by become null when auth user is purged later.
 */
create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  -- Already requested: idempotent (still ensure ban)
  perform set_config('macrio.allow_deletion_mark', 'on', true);

  update public.profiles
  set deletion_requested_at = coalesce(deletion_requested_at, now()),
      updated_at = now()
  where id = v_uid;

  -- Immediate lockout (Supabase Auth respects banned_until)
  update auth.users
  set banned_until = 'infinity'::timestamptz
  where id = v_uid;

  -- Kill existing sessions / refresh tokens (tables vary by GoTrue version)
  begin
    delete from auth.refresh_tokens where user_id = v_uid;
  exception
    when undefined_table then null;
    when insufficient_privilege then null;
  end;

  begin
    delete from auth.sessions where user_id = v_uid;
  exception
    when undefined_table then null;
    when insufficient_privilege then null;
  end;
end;
$$;

revoke execute on function public.delete_account() from anon, public;
grant execute on function public.delete_account() to authenticated;

/*
 * SECTION: Export my data (GDPR)
 * WHAT: JSON bundle of the caller's personal rows for in-app download/share.
 * HOW: security definer select of profile, diary, goal_revisions, feedback
 * INPUT: auth.uid()
 * OUTPUT: jsonb { exported_at, profile, diary_entries, goal_revisions, feedback }
 * NOTE: Body metrics live on profiles; no separate body_metrics table in v1.0.
 */
create or replace function public.export_my_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_profile jsonb;
  v_diary jsonb;
  v_goals jsonb;
  v_feedback jsonb;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select to_jsonb(p) into v_profile
  from public.profiles p
  where p.id = v_uid;

  select coalesce(jsonb_agg(to_jsonb(d) order by d.date, d.logged_at), '[]'::jsonb)
  into v_diary
  from public.diary_entries d
  where d.user_id = v_uid;

  select coalesce(jsonb_agg(to_jsonb(g) order by g.effective_date), '[]'::jsonb)
  into v_goals
  from public.goal_revisions g
  where g.user_id = v_uid;

  select coalesce(jsonb_agg(to_jsonb(f) order by f.created_at), '[]'::jsonb)
  into v_feedback
  from public.feedback f
  where f.user_id = v_uid;

  return jsonb_build_object(
    'exported_at', now(),
    'profile', v_profile,
    'diary_entries', v_diary,
    'goal_revisions', v_goals,
    'feedback', v_feedback
  );
end;
$$;

revoke execute on function public.export_my_data() from anon, public;
grant execute on function public.export_my_data() to authenticated;

/*
 * SECTION: Purge accounts past 30-day grace
 * WHAT: Hard-deletes auth users whose deletion_requested_at is ≥ 30 days ago.
 * HOW: Loop due profile ids → delete auth.users (cascades personal rows; SET NULL on products)
 * INPUT: none (service_role / edge cron only)
 * OUTPUT: number of accounts purged
 *
 * Schedule: Edge Function `purge-deleted-accounts` daily (SETUP.md).
 * Job name: purge-deleted-accounts
 */
create or replace function public.purge_due_deleted_accounts()
returns integer
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_id uuid;
  v_count integer := 0;
begin
  for v_id in
    select p.id
    from public.profiles p
    where p.deletion_requested_at is not null
      and p.deletion_requested_at <= (now() - interval '30 days')
  loop
    -- Cascades: profiles, diary, likes, reports, feedback, goal_revisions
    -- Anonymize: products.created_by / product_versions.edited_by → null (ON DELETE SET NULL)
    delete from auth.users where id = v_id;
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

-- Only service_role should call purge (edge function uses service key)
revoke execute on function public.purge_due_deleted_accounts() from anon, public, authenticated;
grant execute on function public.purge_due_deleted_accounts() to service_role;
