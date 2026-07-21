-- Macrio v1.0.1 — auth reliability: safe nicknames + repair missing profiles
-- Run in Supabase SQL Editor after 003 (and 004 if you use it).
--
-- Fixes:
--   1) Signup trigger: sanitize nickname (email local-parts with '.' used to fail CHECK)
--   2) ensure_own_profile(): create a profile if auth user exists but profile is missing
--   3) Allow authenticated users to insert their own profile row (repair path)

-- Allow self-insert so the app can repair orphan auth users (trigger failed earlier).
drop policy if exists "profiles own insert" on public.profiles;
create policy "profiles own insert" on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

/*
 * SECTION: handle_new_user (signup trigger)
 * WHAT: Creates profiles row with unique, format-safe nickname.
 * HOW: Read nickname from user metadata; fall back to email local-part; strip invalid chars;
 *      if still too short or taken, use user_<idprefix>.
 * INPUT: new auth.users row
 * OUTPUT: profiles insert (id, nickname, full_name)
 */
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_nickname text := nullif(trim(new.raw_user_meta_data->>'nickname'), '');
  v_full_name text := nullif(trim(new.raw_user_meta_data->>'full_name'), '');
  v_fallback text := 'user_' || left(replace(new.id::text, '-', ''), 8);
begin
  if v_nickname is null then
    v_nickname := split_part(coalesce(new.email, ''), '@', 1);
  end if;

  -- Nicknames may only use letters, digits, _ and - (no dots from email local-parts).
  v_nickname := regexp_replace(coalesce(v_nickname, ''), '[^a-zA-Z0-9_-]', '', 'g');

  if v_nickname is null or char_length(v_nickname) < 2 then
    v_nickname := v_fallback;
  end if;

  if exists (select 1 from public.profiles where lower(nickname) = lower(v_nickname)) then
    v_nickname := v_fallback;
  end if;

  insert into public.profiles (id, nickname, full_name)
  values (new.id, v_nickname, v_full_name)
  on conflict (id) do nothing;

  return new;
end;
$$;

/*
 * SECTION: ensure_own_profile
 * WHAT: Returns the caller's profile, creating one if missing (orphan auth user).
 * HOW: Select by auth.uid(); if absent, build a safe nickname and insert.
 * INPUT: authenticated session (auth.uid())
 * OUTPUT: profiles row
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
  v_nickname text;
  v_fallback text;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_row from public.profiles where id = v_uid;
  if found then
    return v_row;
  end if;

  v_fallback := 'user_' || left(replace(v_uid::text, '-', ''), 8);

  select u.email into v_email from auth.users u where u.id = v_uid;
  v_nickname := regexp_replace(split_part(coalesce(v_email, ''), '@', 1), '[^a-zA-Z0-9_-]', '', 'g');
  if v_nickname is null or char_length(v_nickname) < 2 then
    v_nickname := v_fallback;
  end if;
  if exists (select 1 from public.profiles where lower(nickname) = lower(v_nickname) and id <> v_uid) then
    v_nickname := v_fallback;
  end if;

  insert into public.profiles (id, nickname, full_name)
  values (v_uid, v_nickname, null)
  on conflict (id) do nothing;

  select * into v_row from public.profiles where id = v_uid;
  return v_row;
end;
$$;

revoke all on function public.ensure_own_profile() from public;
grant execute on function public.ensure_own_profile() to authenticated;

-- resolve_login_email: return NULL instead of raising (clearer for clients)
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
  where lower(p.nickname) = lower(v_id)
  limit 1;

  return v_email;
end;
$$;
