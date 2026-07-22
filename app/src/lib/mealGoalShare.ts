/*
 * SECTION: Meal goal shares for a day
 * WHAT: Split a daily macro goal across meals/snacks for progress bars.
 * HOW: Each main meal = 2 parts; each snack slot that has food = 1 part.
 *      No snacks logged → each main gets 1/3 of the day goal.
 * INPUT: day goal number, list of meal_slot ids that have entries
 * OUTPUT: goal amount for one slot, or null if slot should not get a share
 */
import { MAIN_SLOTS, SNACK_AFTER } from './nutrition';

const SNACK_SLOTS = MAIN_SLOTS.map((m) => SNACK_AFTER[m]);

export function isMainMealSlot(slot: number): boolean {
  return (MAIN_SLOTS as readonly number[]).includes(slot);
}

export function isSnackSlot(slot: number): boolean {
  return SNACK_SLOTS.includes(slot);
}

/**
 * Goal for one meal_slot given the day's total goal and which slots have food.
 * Empty snack slots are not in slotsWithFood → they get null (no bar).
 */
export function mealSlotGoal(
  dayGoal: number,
  slot: number,
  slotsWithFood: readonly number[]
): number | null {
  if (dayGoal <= 0) return null;

  const snackCount = SNACK_SLOTS.filter((s) => slotsWithFood.includes(s)).length;
  const totalParts = MAIN_SLOTS.length * 2 + snackCount;
  if (totalParts <= 0) return null;

  if (isMainMealSlot(slot)) {
    return (dayGoal * 2) / totalParts;
  }
  if (isSnackSlot(slot) && slotsWithFood.includes(slot)) {
    return dayGoal / totalParts;
  }
  return null;
}
