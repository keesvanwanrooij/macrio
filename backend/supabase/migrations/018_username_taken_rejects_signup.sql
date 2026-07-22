-- Macrio — signup: reject taken usernames (no silent user_<id> fallback)
-- Run after 017_settings_identity_gdpr.sql.
--
-- Problem: handle_new_user() replaced a colliding username with user_<idprefix>,
-- so sign-up succeeded with a random name and the client never saw usernameTaken.
-- Fix: raise on conflict when the user asked for a username; expose is_username_available
-- for a pre-check before auth.signUp. ensure_own_profile still uses the id fallback
-- so orphan auth users can get a repairable profile.

/*
 * SECTION: is_username_available
 * WHAT: Returns true when no profile already uses this username (case-insensitive).
 * HOW: security definer exists-check on profiles.username (anon cannot SELECT others).
 * INPUT: p_username text (trimmed; empty → false)
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
  );
end;
$$;

grant execute on function public.is_username_available(text) to anon, authenticated;

/*
 * SECTION: handle_new_user (signup trigger)
 * WHAT: Creates profiles row from auth.users metadata.
 * HOW: Prefer metadata username; if the user requested a name that is taken, RAISE
 *      username_taken (rolls back auth insert). Only use user_<id> when no username
 *      was requested / format left nothing usable (legacy / edge paths).
 * INPUT: new auth.users row (raw_user_meta_data.username, email)
 * OUTPUT: profiles insert, or exception username_taken
 */
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requested text := nullif(trim(coalesce(
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'nickname'
  )), '');
  v_username text;
  v_full_name text := nullif(trim(new.raw_user_meta_data->>'full_name'), '');
  v_fallback text := 'user_' || left(replace(new.id::text, '-', ''), 8);
begin
  v_username := v_requested;
  if v_username is null then
    v_username := split_part(coalesce(new.email, ''), '@', 1);
  end if;

  -- Strip chars that fail profiles_username_format (e.g. dots in email local-parts).
  v_username := regexp_replace(coalesce(v_username, ''), '[^a-zA-Z0-9_-]', '', 'g');
  if v_username is null or char_length(v_username) < 2 then
    v_username := v_fallback;
  end if;

  if exists (select 1 from public.profiles where lower(username) = lower(v_username)) then
    -- User explicitly chose a username → tell the client; do not invent user_<id>.
    if v_requested is not null then
      raise exception 'username_taken';
    end if;
    v_username := v_fallback;
  end if;

  insert into public.profiles (id, username, full_name)
  values (new.id, v_username, v_full_name)
  on conflict (id) do nothing;

  return new;
end;
$$;
