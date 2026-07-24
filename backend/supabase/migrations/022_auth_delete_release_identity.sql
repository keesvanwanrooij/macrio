/*
 * SECTION: Auth delete reliability (release email/username + safer orphans)
 * WHAT: Soft-delete frees email + username immediately; banned users cannot
 *       get a new profile via ensure_own_profile; username login skips deleted.
 * HOW:
 *   1) delete_account: mark grace → rename profile username → scramble auth email
 *      (+ identities) → ban → kill sessions
 *   2) Backfill already soft-deleted rows the same way
 *   3) ensure_own_profile: refuse banned / pending-delete callers
 *   4) resolve_login_email: ignore deletion_requested_at profiles
 * WHY: Founder testing deleted profiles in Table Editor (or soft-deleted) but
 *      auth.users still held the email → "email taken", login recreated a
 *      blank profile (onboarding) via ensure_own_profile.
 * INPUT: authenticated delete_account; anon resolve_login_email; authenticated ensure
 * OUTPUT: updated RPCs + one-time release for existing soft-deletes
 *
 * Run after 021_drop_goal_macro_mode.sql in Supabase SQL Editor.
 */

/*
 * SECTION: Release auth identity helpers (shared by delete + backfill)
 * WHAT: Scramble auth.users.email / identities so the real email can register again.
 * HOW: Set email to deleted+{uuid}@deleted.macrio.invalid; mirror on email identity.
 * INPUT: auth user id
 * OUTPUT: void (best-effort on identities table shape differences)
 */
create or replace function public._release_auth_identity(p_uid uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email text := 'deleted+' || replace(p_uid::text, '-', '') || '@deleted.macrio.invalid';
begin
  update auth.users
  set
    email = v_email,
    email_confirmed_at = coalesce(email_confirmed_at, now()),
    phone = null,
    raw_user_meta_data =
      coalesce(raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object('macrio_deleted', true, 'username', null),
    updated_at = now()
  where id = p_uid;

  -- Email provider identity (GoTrue): keep unique provider_id in sync with email
  begin
    update auth.identities
    set
      identity_data =
        coalesce(identity_data, '{}'::jsonb)
        || jsonb_build_object(
          'email', v_email,
          'email_verified', false,
          'sub', coalesce(identity_data->>'sub', p_uid::text)
        ),
      provider_id = v_email,
      updated_at = now()
    where user_id = p_uid
      and provider = 'email';
  exception
    when undefined_table then null;
    when undefined_column then null;
    when others then null;
  end;
end;
$$;

revoke all on function public._release_auth_identity(uuid) from public, anon, authenticated;
-- Only other security-definer functions call this (same owner / postgres)

/*
 * SECTION: Soft-delete account (immediate lockout + free email/username)
 * WHAT: Marks profile for 30-day purge, frees login identifiers, bans auth user.
 * HOW: GUC → deletion_requested_at → username deleted_* → release email → ban → tokens
 * INPUT: auth.uid()
 * OUTPUT: void; caller should signOut locally
 */
create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_username text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  perform set_config('macrio.allow_deletion_mark', 'on', true);

  v_username := 'deleted_' || left(replace(v_uid::text, '-', ''), 12);

  update public.profiles
  set
    deletion_requested_at = coalesce(deletion_requested_at, now()),
    username = v_username,
    updated_at = now()
  where id = v_uid;

  -- If profile row was already gone (manual delete), still lock out auth
  perform public._release_auth_identity(v_uid);

  update auth.users
  set banned_until = 'infinity'::timestamptz
  where id = v_uid;

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
 * SECTION: Backfill soft-deleted accounts (release emails already held)
 * WHAT: For profiles already in grace, free email + username the same way.
 * HOW: Loop deletion_requested_at is not null → rename username → release + ban
 * INPUT: none (migration one-shot)
 * OUTPUT: updated rows
 */
do $$
declare
  r record;
  v_username text;
begin
  perform set_config('macrio.allow_deletion_mark', 'on', true);

  for r in
    select p.id
    from public.profiles p
    where p.deletion_requested_at is not null
  loop
    v_username := 'deleted_' || left(replace(r.id::text, '-', ''), 12);

    update public.profiles
    set username = v_username, updated_at = now()
    where id = r.id
      and username is distinct from v_username;

    perform public._release_auth_identity(r.id);

    update auth.users
    set banned_until = 'infinity'::timestamptz
    where id = r.id;
  end loop;
end;
$$;

/*
 * SECTION: ensure_own_profile (orphan repair, no revive of deleted accounts)
 * WHAT: Returns caller's profile; creates one only for live (non-banned) auth users.
 * HOW: select → if missing and not banned/deleted-meta → insert → return
 * INPUT: auth.uid()
 * OUTPUT: profiles row, or exception account_deleted / not_authenticated
 */
create or replace function public.ensure_own_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.profiles;
  v_email text;
  v_username text;
  v_fallback text;
  v_banned timestamptz;
  v_deleted_meta boolean;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_row from public.profiles where id = v_uid;
  if found then
    if v_row.deletion_requested_at is not null then
      raise exception 'account_deleted';
    end if;
    return v_row;
  end if;

  select u.email, u.banned_until,
         coalesce((u.raw_user_meta_data->>'macrio_deleted')::boolean, false)
    into v_email, v_banned, v_deleted_meta
  from auth.users u
  where u.id = v_uid;

  if v_deleted_meta
     or (v_banned is not null and v_banned > now())
     or coalesce(v_email, '') like 'deleted+%@deleted.macrio.invalid' then
    raise exception 'account_deleted';
  end if;

  v_fallback := 'user_' || left(replace(v_uid::text, '-', ''), 8);

  v_username := regexp_replace(split_part(coalesce(v_email, ''), '@', 1), '[^a-zA-Z0-9_-]', '', 'g');
  if v_username is null or char_length(v_username) < 2 then
    v_username := v_fallback;
  end if;
  if exists (select 1 from public.profiles where lower(username) = lower(v_username) and id <> v_uid) then
    v_username := v_fallback;
  end if;

  insert into public.profiles (id, username, full_name)
  values (v_uid, v_username, null)
  on conflict (id) do nothing;

  select * into v_row from public.profiles where id = v_uid;
  return v_row;
end;
$$;

revoke all on function public.ensure_own_profile() from public;
grant execute on function public.ensure_own_profile() to authenticated;

/*
 * SECTION: resolve_login_email
 * WHAT: Maps username (or email-shaped string) → auth email for sign-in.
 * HOW: Email: lowercased. Username: join profiles↔auth.users, skip soft-deleted.
 * INPUT: p_identifier text
 * OUTPUT: email text or null
 */
create or replace function public.resolve_login_email(p_identifier text)
returns text
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_id text := trim(p_identifier);
  v_email text;
begin
  if v_id = '' then
    return null;
  end if;

  if position('@' in v_id) > 0 then
    return lower(v_id);
  end if;

  select u.email into v_email
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(p.username) = lower(v_id)
    and p.deletion_requested_at is null
    and (u.banned_until is null or u.banned_until <= now())
  limit 1;

  return v_email;
end;
$$;

revoke all on function public.resolve_login_email(text) from public;
grant execute on function public.resolve_login_email(text) to anon, authenticated;

/*
 * SECTION: is_username_available
 * WHAT: Username free if no live (non-deleted) profile uses it.
 * HOW: exists-check ignoring soft-deleted rows (their names are deleted_* anyway)
 * INPUT: p_username
 * OUTPUT: boolean
 */
create or replace function public.is_username_available(p_username text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text := nullif(trim(p_username), '');
begin
  if v_username is null then
    return false;
  end if;

  return not exists (
    select 1
    from public.profiles
    where lower(username) = lower(v_username)
      and deletion_requested_at is null
  );
end;
$$;

grant execute on function public.is_username_available(text) to anon, authenticated;
