-- Macrio v1.0.1 — remove legacy profiles.display_name
-- Run in Supabase SQL Editor after 003_profiles_nickname.sql.
--
-- nickname + full_name replace display_name. This migration backfills any
-- missing nicknames from display_name, updates the signup trigger, then drops
-- the column.

-- Step 1: Copy nickname from display_name where still empty (safety for old rows)
update public.profiles
set nickname = coalesce(
  nullif(trim(display_name), ''),
  'user_' || left(replace(id::text, '-', ''), 8)
)
where (nickname is null or trim(nickname) = '')
  and display_name is not null;

update public.profiles
set nickname = regexp_replace(nickname, '\s+', '_', 'g')
where nickname ~ '\s';

-- Step 2: Signup trigger — no display_name column
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

-- Step 3: Drop legacy column
alter table public.profiles drop column if exists display_name;
