-- SECTION: Weight goal rates (moderate ±300 / fast ±500)
-- WHAT: Allow lose_fast / gain_fast on profiles.weight_goal; keep lose / maintain / gain.
-- HOW: Drop old check constraint; add extended allowed values.
-- INPUT: existing lose | maintain | gain rows stay valid
-- OUTPUT: profiles.weight_goal may also be lose_fast | gain_fast
--
-- Run in Supabase SQL Editor after 019_goal_macro_mode.sql.

alter table public.profiles drop constraint if exists profiles_weight_goal_check;

alter table public.profiles
  add constraint profiles_weight_goal_check
  check (
    weight_goal is null
    or weight_goal in ('lose_fast', 'lose', 'maintain', 'gain', 'gain_fast')
  );
