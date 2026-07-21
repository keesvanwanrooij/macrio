-- Macrio v1.0.1 — weight goal intent on profiles (lose / maintain / gain)
-- Run after 006_profile_body_metrics.sql.

alter table public.profiles
  add column if not exists weight_goal text;

alter table public.profiles drop constraint if exists profiles_weight_goal_check;
alter table public.profiles
  add constraint profiles_weight_goal_check
  check (weight_goal is null or weight_goal in ('lose', 'maintain', 'gain'));
