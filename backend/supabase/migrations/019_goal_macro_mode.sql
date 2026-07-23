/*
 * SECTION: Profile goal macro mode (v0.4.1)
 * WHAT: Remembers how the user edits daily macro targets (Simple / Athlete / Keto).
 * HOW: Add text column with check constraint; default simple for existing rows.
 * INPUT: profiles row
 * OUTPUT: profiles.goal_macro_mode used by GoalMacroEditor
 */

alter table public.profiles
  add column if not exists goal_macro_mode text not null default 'simple';

alter table public.profiles drop constraint if exists profiles_goal_macro_mode_check;
alter table public.profiles
  add constraint profiles_goal_macro_mode_check
  check (goal_macro_mode in ('simple', 'athlete', 'keto'));

comment on column public.profiles.goal_macro_mode is
  'Editing lens for daily macros: simple (%), athlete (g/kg protein + fat %), keto (%).';
