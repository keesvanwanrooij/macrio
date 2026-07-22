/*
 * SECTION: Goal revision helpers
 * WHAT: Persist today's goals for historical reports; resolve goal for any date.
 * HOW: RPC upsert_goal_revision_for_today; client loads revisions and picks
 *      latest effective_date <= target day.
 * INPUT: goal numbers / revision rows / date string YYYY-MM-DD
 * OUTPUT: void | GoalSnapshot | null
 */
import { supabase } from './supabase';
import type { MacroKey } from './macroLabels';

export type GoalSnapshot = {
  effective_date: string;
  goal_kcal: number | null;
  goal_carbs: number | null;
  goal_protein: number | null;
  goal_fat: number | null;
};

export async function upsertTodayGoalRevision(goals: {
  goal_kcal: number | null;
  goal_carbs: number | null;
  goal_protein: number | null;
  goal_fat: number | null;
}): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('upsert_goal_revision_for_today', {
    p_goal_kcal: goals.goal_kcal,
    p_goal_carbs: goals.goal_carbs,
    p_goal_protein: goals.goal_protein,
    p_goal_fat: goals.goal_fat,
  });
  return { error: error?.message ?? null };
}

/** Load all revisions with effective_date <= endDate for the current user. */
export async function fetchGoalRevisionsUpTo(endDate: string): Promise<GoalSnapshot[]> {
  const { data, error } = await supabase
    .from('goal_revisions')
    .select('effective_date, goal_kcal, goal_carbs, goal_protein, goal_fat')
    .lte('effective_date', endDate)
    .order('effective_date', { ascending: true });
  if (error || !data) return [];
  return data as GoalSnapshot[];
}

/** Latest revision with effective_date <= date. */
export function resolveGoalForDate(
  revisions: GoalSnapshot[],
  date: string
): GoalSnapshot | null {
  let best: GoalSnapshot | null = null;
  for (const r of revisions) {
    if (r.effective_date <= date) best = r;
    else break;
  }
  return best;
}

export function goalValue(snap: GoalSnapshot | null, key: MacroKey): number | null {
  if (!snap) return null;
  switch (key) {
    case 'kcal':
      return snap.goal_kcal;
    case 'carbs':
      return snap.goal_carbs;
    case 'protein':
      return snap.goal_protein;
    case 'fat':
      return snap.goal_fat;
  }
}
