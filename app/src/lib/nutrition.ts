import type { DiaryEntry, MacroTotals, ProductVersion } from './types';

// Meal slots: 0=breakfast, 1=snack, 2=lunch, 3=snack, 4=dinner, 5=snack
export const MAIN_SLOTS = [0, 2, 4] as const;
export const SNACK_AFTER: Record<number, number> = { 0: 1, 2: 3, 4: 5 };

export function slotLabelKey(slot: number): string {
  switch (slot) {
    case 0: return 'meals.breakfast';
    case 2: return 'meals.lunch';
    case 4: return 'meals.dinner';
    default: return 'meals.snack';
  }
}

export function macrosForGrams(v: ProductVersion, grams: number): MacroTotals {
  const f = grams / 100;
  return {
    kcal: v.kcal_100g * f,
    carbs: v.carbs_100g * f,
    protein: v.protein_100g * f,
    fat: v.fat_100g * f,
  };
}

export function sumEntries(entries: DiaryEntry[]): MacroTotals {
  return entries.reduce(
    (acc, e) => ({
      kcal: acc.kcal + Number(e.kcal),
      carbs: acc.carbs + Number(e.carbs),
      protein: acc.protein + Number(e.protein),
      fat: acc.fat + Number(e.fat),
    }),
    { kcal: 0, carbs: 0, protein: 0, fat: 0 }
  );
}

export function fmt(n: number, digits = 0): string {
  return Number(n).toFixed(digits).replace('.', ',');
}

// Parses "12,5" and "12.5" alike (Dutch keyboards give commas).
export function parseNum(s: string): number {
  const n = parseFloat(String(s).replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

export function versionName(v: ProductVersion, language: string): string {
  if (language === 'nl') return v.name_nl ?? v.name_en ?? '?';
  return v.name_en ?? v.name_nl ?? '?';
}

export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return toDateString(d);
}
