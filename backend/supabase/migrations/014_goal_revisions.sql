-- Macrio — historical daily goals for reports
-- Run in Supabase SQL Editor after 013.
--
-- profiles.goal_* = live editable goals
-- goal_revisions = what the goal was from effective_date onward (until next revision)

/*
 * SECTION: goal_revisions
 * WHAT: Append-only-ish history of user macro goals by effective calendar date.
 * HOW: Upsert one row per (user, effective_date); reports pick latest revision
 *      with effective_date <= the day being viewed.
 * INPUT: user_id, effective_date, four optional goal numbers
 * OUTPUT: rows for chart goal lines
 */
create table if not exists public.goal_revisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  effective_date date not null,
  goal_kcal numeric check (goal_kcal is null or goal_kcal >= 0),
  goal_carbs numeric check (goal_carbs is null or goal_carbs >= 0),
  goal_protein numeric check (goal_protein is null or goal_protein >= 0),
  goal_fat numeric check (goal_fat is null or goal_fat >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, effective_date)
);

create index if not exists goal_revisions_user_date_idx
  on public.goal_revisions (user_id, effective_date desc);

alter table public.goal_revisions enable row level security;

drop policy if exists "goal_revisions own select" on public.goal_revisions;
create policy "goal_revisions own select" on public.goal_revisions
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "goal_revisions own insert" on public.goal_revisions;
create policy "goal_revisions own insert" on public.goal_revisions
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "goal_revisions own update" on public.goal_revisions;
create policy "goal_revisions own update" on public.goal_revisions
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update on table public.goal_revisions to authenticated;

/*
 * SECTION: upsert_goal_revision_for_today
 * WHAT: Writes/replaces today's goal revision from the caller's current goals.
 * INPUT: four goal numbers (nullable)
 * OUTPUT: void
 */
create or replace function public.upsert_goal_revision_for_today(
  p_goal_kcal numeric,
  p_goal_carbs numeric,
  p_goal_protein numeric,
  p_goal_fat numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.goal_revisions (
    user_id, effective_date, goal_kcal, goal_carbs, goal_protein, goal_fat
  )
  values (
    auth.uid(),
    (timezone('utc', now()))::date,
    p_goal_kcal,
    p_goal_carbs,
    p_goal_protein,
    p_goal_fat
  )
  on conflict (user_id, effective_date) do update set
    goal_kcal = excluded.goal_kcal,
    goal_carbs = excluded.goal_carbs,
    goal_protein = excluded.goal_protein,
    goal_fat = excluded.goal_fat;
end;
$$;

revoke all on function public.upsert_goal_revision_for_today(numeric, numeric, numeric, numeric) from public;
grant execute on function public.upsert_goal_revision_for_today(numeric, numeric, numeric, numeric) to authenticated;

-- Backfill: one revision for today from existing profile goals (skip empty)
insert into public.goal_revisions (
  user_id, effective_date, goal_kcal, goal_carbs, goal_protein, goal_fat
)
select
  p.id,
  (timezone('utc', now()))::date,
  p.goal_kcal,
  p.goal_carbs,
  p.goal_protein,
  p.goal_fat
from public.profiles p
where p.goal_kcal is not null
   or p.goal_carbs is not null
   or p.goal_protein is not null
   or p.goal_fat is not null
on conflict (user_id, effective_date) do nothing;
