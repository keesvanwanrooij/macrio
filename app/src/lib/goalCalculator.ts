/*
 * SECTION: Daily goal calculator + unified % macro math
 * WHAT: Mifflin-St Jeor kcal; default 50/20/30 C/P/F; % ring for GoalMacroEditor.
 * HOW:
 *   1) BMR × activity → TDEE ± goal delta
 *   2) Macros from kcal via DEFAULT_MACRO_PERCENTS (not personal g/kg)
 *   3) Soft height/weight validation
 *   4) Editor: locked % + ring (C→P→F→C); see GoalMacroEditor for two-way rules
 * INPUT: body stats; GoalFields; MacroPercents
 * OUTPUT: goals, soft errors, percent helpers
 */

export type Gender = 'male' | 'female' | 'other';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

/** lose = cut, maintain = TDEE, gain = lean bulk / muscle */
export type WeightGoal = 'lose' | 'maintain' | 'gain';

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

/** Daily kcal offset from maintenance TDEE. */
export const WEIGHT_GOAL_KCAL_DELTA: Record<WeightGoal, number> = {
  lose: -500,
  maintain: 0,
  gain: 300,
};

/** Unified default % of daily kcal (carbs / protein / fat). */
export const DEFAULT_MACRO_PERCENTS: MacroPercents = {
  carbs: 50,
  protein: 20,
  fat: 30,
};

/** Floor for % slider max; actual max = max(PERCENT_SLIDER_FLOOR, highest %). */
export const PERCENT_SLIDER_FLOOR = 60;

/** Soft body limits with friendly messages (height/weight only; no age message). */
export const HEIGHT_CM_SOFT = { min: 100, max: 230 } as const;
export const WEIGHT_KG_SOFT = { min: 30, max: 250 } as const;

export const GENDERS: Gender[] = ['male', 'female', 'other'];
export const ACTIVITIES: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'very_active'];
export const WEIGHT_GOALS: WeightGoal[] = ['lose', 'maintain', 'gain'];

export type GoalCalcInput = {
  weightKg: number;
  heightCm: number;
  ageYears: number;
  gender: Gender;
  activity: ActivityLevel;
  weightGoal: WeightGoal;
};

export type GoalCalcResult = {
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
};

export type BodyMetricsDraft = {
  date_of_birth: string;
  height_cm: number;
  weight_kg: number;
  gender: Gender;
  activity_level: ActivityLevel;
  weight_goal: WeightGoal;
};

export type SoftBodyError = 'height' | 'weight' | 'nonPositive' | 'missing';

export type GoalFieldKey = 'kcal' | 'protein' | 'carbs' | 'fat';

export type GoalFields = {
  kcal: string;
  protein: string;
  carbs: string;
  fat: string;
};

export type MacroPercents = { protein: number; carbs: number; fat: number };

/** Age in whole years from YYYY-MM-DD. */
export function ageFromDateOfBirth(isoDate: string, now = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  let age = now.getFullYear() - year;
  const hadBirthday =
    now.getMonth() + 1 > month || (now.getMonth() + 1 === month && now.getDate() >= day);
  if (!hadBirthday) age -= 1;
  return age;
}

export function isGender(v: string | null | undefined): v is Gender {
  return v === 'male' || v === 'female' || v === 'other';
}

export function isActivityLevel(v: string | null | undefined): v is ActivityLevel {
  return v === 'sedentary' || v === 'light' || v === 'moderate' || v === 'active' || v === 'very_active';
}

export function isWeightGoal(v: string | null | undefined): v is WeightGoal {
  return v === 'lose' || v === 'maintain' || v === 'gain';
}

/** Mifflin-St Jeor resting energy (kcal/day). */
export function estimateBmr(input: Pick<GoalCalcInput, 'weightKg' | 'heightCm' | 'ageYears' | 'gender'>): number {
  const { weightKg, heightCm, ageYears, gender } = input;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  if (gender === 'male') return base + 5;
  if (gender === 'female') return base - 161;
  return base - 78;
}

export function macroGramsToKcal(protein: number, carbs: number, fat: number): number {
  return protein * 4 + carbs * 4 + fat * 9;
}

export function gramsToKcal(macro: 'protein' | 'carbs' | 'fat', grams: number): number {
  if (macro === 'fat') return grams * 9;
  return grams * 4;
}

export function gPerKg(grams: number, weightKg: number): number {
  if (!(weightKg > 0)) return 0;
  return grams / weightKg;
}

/**
 * Soft height/weight check for calculator UX.
 * No age soft-range message (caller may still require a valid DOB for Mifflin).
 */
export function softBodyValidation(heightCm: number, weightKg: number): SoftBodyError | null {
  if (!(heightCm > 0) || !(weightKg > 0)) return 'nonPositive';
  if (heightCm < HEIGHT_CM_SOFT.min || heightCm > HEIGHT_CM_SOFT.max) return 'height';
  if (weightKg < WEIGHT_KG_SOFT.min || weightKg > WEIGHT_KG_SOFT.max) return 'weight';
  return null;
}

/** Slider max for % bars: at least 60, or the highest current percentage. */
export function percentScaleMax(percents: MacroPercents): number {
  return Math.max(PERCENT_SLIDER_FLOOR, percents.protein, percents.carbs, percents.fat);
}

/** Grams → % of daily kcal (0 if kcal missing). */
export function percentsFromGrams(
  kcal: number,
  protein: number,
  carbs: number,
  fat: number
): MacroPercents {
  if (!(kcal > 0)) return { protein: 0, carbs: 0, fat: 0 };
  return {
    protein: (protein * 4 * 100) / kcal,
    carbs: (carbs * 4 * 100) / kcal,
    fat: (fat * 9 * 100) / kcal,
  };
}

/** % of kcal → whole grams. Protein/fat from %; carbs take remaining kcal. */
export function gramsFromPercents(kcal: number, percents: MacroPercents): GoalCalcResult {
  if (!(kcal > 0)) return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
  const protein = Math.max(0, Math.round((kcal * (percents.protein / 100)) / 4));
  const fat = Math.max(0, Math.round((kcal * (percents.fat / 100)) / 9));
  const used = protein * 4 + fat * 9;
  const carbs = Math.max(0, Math.floor((kcal - used) / 4));
  return { kcal, protein, carbs, fat };
}

/** True when P+C+F % look like a real split (~100). */
export function isReliablePercentSplit(percents: MacroPercents): boolean {
  const sum = percents.protein + percents.carbs + percents.fat;
  return sum >= 90 && sum <= 110;
}

const RING_NEXT: Record<'protein' | 'carbs' | 'fat', 'protein' | 'carbs' | 'fat'> = {
  carbs: 'protein',
  protein: 'fat',
  fat: 'carbs',
};

const RING_THIRD: Record<'protein' | 'carbs' | 'fat', 'protein' | 'carbs' | 'fat'> = {
  carbs: 'fat',
  protein: 'carbs',
  fat: 'protein',
};

/**
 * Change one %; next in ring absorbs the delta so the three still sum to ~100.
 * Spill to the third macro if the next hits 0 or the scale max.
 * Ring order: carbs → protein → fat → carbs.
 */
export function applyPercentRingChange(
  percents: MacroPercents,
  changed: 'protein' | 'carbs' | 'fat',
  nextValue: number
): MacroPercents {
  const scale = Math.max(
    PERCENT_SLIDER_FLOOR,
    percents.protein,
    percents.carbs,
    percents.fat,
    nextValue
  );
  const clamped = Math.min(scale, Math.max(0, nextValue));
  const next: MacroPercents = { ...percents, [changed]: clamped };
  const delta = clamped - percents[changed];
  if (delta === 0) return next;

  const absorbKey = RING_NEXT[changed];
  const thirdKey = RING_THIRD[changed];
  let absorb = percents[absorbKey] - delta;

  if (absorb < 0) {
    next[thirdKey] = Math.max(0, percents[thirdKey] + absorb);
    absorb = 0;
  } else if (absorb > scale) {
    next[thirdKey] = Math.max(0, percents[thirdKey] + (absorb - scale));
    absorb = scale;
  }
  next[absorbKey] = absorb;

  const sum = next.protein + next.carbs + next.fat;
  if (sum > 0 && Math.abs(sum - 100) > 0.05 && Math.abs(sum - 100) < 2) {
    next[absorbKey] = Math.max(0, next[absorbKey] + (100 - sum));
  }
  return next;
}

/** GoalFields from kcal using default (or provided) % split. */
export function goalsFromPercents(
  kcal: number,
  percents: MacroPercents = DEFAULT_MACRO_PERCENTS
): GoalFields {
  if (!(kcal > 0)) {
    return { kcal: '', protein: '', carbs: '', fat: '' };
  }
  const grams = gramsFromPercents(kcal, percents);
  return {
    kcal: String(kcal),
    protein: String(grams.protein),
    carbs: String(grams.carbs),
    fat: String(grams.fat),
  };
}

/**
 * Macro split from a kcal target: default 50/20/30 (C/P/F).
 * weightKg / weightGoal kept optional for call-site compat; ignored.
 */
export function macrosFromKcal(
  kcal: number,
  _weightKg?: number,
  _weightGoal?: WeightGoal
): Pick<GoalCalcResult, 'carbs' | 'protein' | 'fat'> | null {
  if (!(kcal > 0)) return null;
  const grams = gramsFromPercents(kcal, DEFAULT_MACRO_PERCENTS);
  return { protein: grams.protein, carbs: grams.carbs, fat: grams.fat };
}

/** True when all four goal fields are empty (user clearing goals). */
export function goalsFieldsAllEmpty(fields: GoalFields): boolean {
  return (
    fields.kcal.trim() === '' &&
    fields.protein.trim() === '' &&
    fields.carbs.trim() === '' &&
    fields.fat.trim() === ''
  );
}

/** True when kcal and all macros are finite and > 0. */
export function goalsFieldsComplete(fields: GoalFields): boolean {
  const k = Number(String(fields.kcal).replace(',', '.'));
  const p = Number(String(fields.protein).replace(',', '.'));
  const c = Number(String(fields.carbs).replace(',', '.'));
  const f = Number(String(fields.fat).replace(',', '.'));
  return [k, p, c, f].every((n) => Number.isFinite(n) && n > 0);
}

export function calculateDailyGoals(input: GoalCalcInput): GoalCalcResult | null {
  const { weightKg, heightCm, ageYears, gender, activity, weightGoal } = input;
  if (!(weightKg > 0) || !(heightCm > 0) || !(ageYears > 0)) {
    return null;
  }

  const soft = softBodyValidation(heightCm, weightKg);
  if (soft) return null;

  const bmr = estimateBmr({ weightKg, heightCm, ageYears, gender });
  const tdee = Math.round(bmr * ACTIVITY_FACTORS[activity]);
  const kcal = Math.max(1200, tdee + WEIGHT_GOAL_KCAL_DELTA[weightGoal]);
  const macros = macrosFromKcal(kcal);
  if (!macros) return null;
  return { kcal, ...macros };
}
