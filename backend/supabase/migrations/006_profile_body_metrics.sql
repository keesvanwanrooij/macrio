-- Macrio v1.0.1 — profile body metrics for goal calculator + future profile
-- Run after 005_auth_profile_repair.sql.
--
-- Stores: date_of_birth (age derived in app), height_cm, weight_kg, gender, activity_level.
-- Private to the user (existing profiles RLS: own read/update).

alter table public.profiles
  add column if not exists date_of_birth date,
  add column if not exists height_cm numeric,
  add column if not exists weight_kg numeric,
  add column if not exists gender text,
  add column if not exists activity_level text;

alter table public.profiles drop constraint if exists profiles_height_cm_check;
alter table public.profiles
  add constraint profiles_height_cm_check
  check (height_cm is null or (height_cm > 0 and height_cm < 300));

alter table public.profiles drop constraint if exists profiles_weight_kg_check;
alter table public.profiles
  add constraint profiles_weight_kg_check
  check (weight_kg is null or (weight_kg > 0 and weight_kg < 400));

alter table public.profiles drop constraint if exists profiles_gender_check;
alter table public.profiles
  add constraint profiles_gender_check
  check (gender is null or gender in ('male', 'female', 'other'));

alter table public.profiles drop constraint if exists profiles_activity_level_check;
alter table public.profiles
  add constraint profiles_activity_level_check
  check (
    activity_level is null
    or activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')
  );
