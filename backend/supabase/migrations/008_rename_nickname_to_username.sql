-- Macrio v1.0.1 — rename profiles.nickname → username
-- Run after 007_profile_weight_goal.sql.
--
-- Updates: column, CHECK, unique index, handle_new_user, ensure_own_profile, resolve_login_email.
-- Signup metadata key is now `username` (legacy `nickname` still accepted).

-- Rename column (no-op if already renamed)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'nickname'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'username'
  ) then
    alter table public.profiles rename column nickname to username;
  end if;
end $$;

alter table public.profiles drop constraint if exists profiles_nickname_format;
alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles
  add constraint profiles_username_format
  check (username ~ '^[a-zA-Z0-9_-]+$' and char_length(username) >= 2);

drop index if exists public.profiles_nickname_lower_idx;
create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username));

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_username text := nullif(trim(coalesce(
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'nickname'
  )), '');
  v_full_name text := nullif(trim(new.raw_user_meta_data->>'full_name'), '');
  v_fallback text := 'user_' || left(replace(new.id::text, '-', ''), 8);
begin
  if v_username is null then
    v_username := split_part(coalesce(new.email, ''), '@', 1);
  end if;
  v_username := regexp_replace(coalesce(v_username, ''), '[^a-zA-Z0-9_-]', '', 'g');
  if v_username is null or char_length(v_username) < 2 then
    v_username := v_fallback;
  end if;
  if exists (select 1 from public.profiles where lower(username) = lower(v_username)) then
    v_username := v_fallback;
  end if;

  insert into public.profiles (id, username, full_name)
  values (new.id, v_username, v_full_name)
  on conflict (id) do nothing;

  return new;
end;
$$;

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
  limit 1;

  return v_email;
end;
$$;
