/*
 * SECTION: Meal goal scale for reports day
 * WHAT: One shared scale for breakfast/lunch/dinner (+ snacks) progress bars.
 * HOW: mealScale = (dayGoal − snackSum) / 3 when remainder > 0; else dayGoal / 3.
 *      Snacks use the same scale so bars are comparable.
 * INPUT: day goal, total of selected macro in snack slots
 * OUTPUT: per-meal scale number
 */
import { MAIN_SLOTS, SNACK_AFTER } from './nutrition';
import type { DiaryEntry } from './types';
import type { MacroKey } from './macroLabels';

const SNACK_SLOTS = MAIN_SLOTS.map((m) => SNACK_AFTER[m]);

export function isMainMealSlot(slot: number): boolean {
  return (MAIN_SLOTS as readonly number[]).includes(slot);
}

export function isSnackSlot(slot: number): boolean {
  return SNACK_SLOTS.includes(slot);
}

/** Sum of one macro across all snack entries for the day. */
export function snackMacroTotal(entries: readonly DiaryEntry[], key: MacroKey): number {
  return entries.reduce((sum, e) => {
    if (!isSnackSlot(Number(e.meal_slot))) return sum;
    return sum + Number(e[key] ?? 0);
  }, 0);
}

/**
 * Shared bar scale for all meal/snack rows that day.
 * Deduct snacks from the day goal, split the rest across 3 mains.
 * If snacks already used up the day goal, fall back to dayGoal / 3.
 */
export function mealScaleFromDayGoal(dayGoal: number, snackTotal: number): number {
  if (!(dayGoal > 0)) return 0;
  const remainder = dayGoal - Math.max(0, snackTotal);
  if (remainder > 0) return remainder / 3;
  return dayGoal / 3;
}

/** Fallback when the user has no goal for this macro: 2000 kcal + maintain split at 70 kg. */
export const DEFAULT_GOAL_KCAL = 2000;
export const DEFAULT_GOAL_WEIGHT_KG = 70;
