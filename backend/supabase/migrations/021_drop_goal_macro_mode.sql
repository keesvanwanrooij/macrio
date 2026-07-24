-- SECTION: Drop unused goal_macro_mode
-- WHAT: Remove profiles.goal_macro_mode left from superseded Simple/Athlete/Keto modes.
-- HOW: Drop check constraint, then drop the column.
-- INPUT: profiles rows that may still have simple | athlete | keto
-- OUTPUT: column gone; UI already uses unified % macros only
--
-- Run in Supabase SQL Editor after 020_weight_goal_rates.sql.

alter table public.profiles drop constraint if exists profiles_goal_macro_mode_check;

alter table public.profiles drop column if exists goal_macro_mode;
