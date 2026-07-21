-- Macrio v1.0.1 — profiles: nickname + full name; login by email or nickname
-- Run in Supabase SQL Editor after 001_init.sql and 002_seed.sql.
--
-- Adds:
--   nickname  — public, unique (case-insensitive), no spaces (a-z A-Z 0-9 _ -)
--   full_name — private, optional (set later in Settings), not used for login
--   resolve_login_email() — maps email or nickname → auth email for sign-in
--   handle_new_user()     — updated signup trigger
--
-- Email uniqueness is enforced by Supabase Auth (auth.users), not this migration.

alter table public.profiles
  add column if not exists nickname text,
  add column if not exists full_name text;

-- Backfill existing rows (founder DBs that only ran 001).
update public.profiles
set
  full_name = nullif(trim(full_name), ''),
  nickname = coalesce(
    nullif(trim(nickname), ''),
    'user_' || left(replace(id::text, '-', ''), 8)
  )
where nickname is null or full_name is null;

update public.profiles
set nickname = regexp_replace(nickname, '\s+', '_', 'g')
where nickname ~ '\s';

alter table public.profiles
  alter column nickname set not null;

alter table public.profiles drop constraint if exists profiles_nickname_format;
alter table public.profiles
  add constraint profiles_nickname_format
  check (nickname ~ '^[a-zA-Z0-9_-]+$' and char_length(nickname) >= 2);

create unique index if not exists profiles_nickname_lower_idx
  on public.profiles (lower(nickname));

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_nickname text := nullif(trim(new.raw_user_meta_data->>'nickname'), '');
  v_full_name text := nullif(trim(new.raw_user_meta_data->>'full_name'), '');
begin
  if v_nickname is null then
    v_nickname := split_part(new.email, '@', 1);
  end if;
  v_nickname := regexp_replace(v_nickname, '\s+', '', 'g');

  insert into public.profiles (id, nickname, full_name)
  values (new.id, v_nickname, v_full_name);

  return new;
end;
$$;

/*
 * resolve_login_email — map login identifier to auth email
 * WHAT: Sign-in accepts email or nickname only (not full name).
 * HOW: Email passthrough; nickname case-insensitive unique lookup.
 * INPUT: p_identifier text (from sign-in field)
 * OUTPUT: email text, or raises not_found
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
    raise exception 'not_found';
  end if;

  if position('@' in v_id) > 0 then
    return lower(v_id);
  end if;

  select u.email into v_email
  from public.profiles p
  join auth.users u on u.id = p.id
  where lower(p.nickname) = lower(v_id)
  limit 1;

  if v_email is not null then
    return v_email;
  end if;

  raise exception 'not_found';
end;
$$;

revoke all on function public.resolve_login_email(text) from public;
grant execute on function public.resolve_login_email(text) to anon, authenticated;
