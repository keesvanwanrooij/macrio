/*
 * SECTION: Daily goal calculator (Mifflin-St Jeor + macro heuristics + soft UX math)
 * WHAT: Estimates target kcal/macros from body stats; soft height/weight limits;
 *       g/kg rails; kcal↔macro cascade for GoalMacroEditor.
 * HOW:
 *   1) BMR (Mifflin-St Jeor) × activity → TDEE ± goal delta
 *   2) Protein/fat g/kg heuristics; carbs = remaining kcal
 *   3) Soft validate height/weight for friendly copy; block ≤ 0
 *   4) Cascade: kcal→macros; P/F→carbs; carbs→kcal; empty-field fill on sibling change
 * INPUT: weight, height, age/DOB, gender, activity, weight goal; editor field strings
 * OUTPUT: goals, soft errors, cascade next state
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

/** Protein g/kg: higher on cut/gain to support muscle; capped so macros stay realistic. */
export const PROTEIN_G_PER_KG_BY_GOAL: Record<WeightGoal, number> = {
  lose: 1.8,
  maintain: 1.2,
  gain: 1.6,
};

/** Fat g/kg (common adequate-fat midpoint). */
export const FAT_G_PER_KG = 0.9;

/** Soft slider rails (g/kg). Thumb travel clamps here; typed grams may overshoot. */
export const PROTEIN_G_PER_KG_RANGE = { min: 0.8, max: 2.2 } as const;
export const FAT_G_PER_KG_RANGE = { min: 0.5, max: 1.5 } as const;
export const CARBS_G_PER_KG_RANGE = { min: 3.0, max: 10.0 } as const;

/** Soft body limits with friendly messages (height/weight only; no age message). */
export const HEIGHT_CM_SOFT = { min: 100, max: 230 } as const;
export const WEIGHT_KG_SOFT = { min: 30, max: 250 } as const;

/** Warn when |kcal - macroKcal| / kcal exceeds this fraction. */
export const KCAL_BALANCE_TOLERANCE = 0.05;

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

export function gramsFromGPerKg(gPerKgValue: number, weightKg: number): number {
  return Math.floor(Math.max(0, gPerKgValue * weightKg));
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

/** True when |kcal - macroKcal| / kcal > 5% (and kcal > 0). */
export function isKcalOutOfBalance(kcal: number, protein: number, carbs: number, fat: number): boolean {
  if (!(kcal > 0)) return false;
  const fromMacros = macroGramsToKcal(protein, carbs, fat);
  return Math.abs(kcal - fromMacros) / kcal > KCAL_BALANCE_TOLERANCE;
}

function parseOptionalGrams(raw: string): number | null {
  const t = raw.trim();
  if (t === '') return null;
  const n = Number(String(t).replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  return n;
}

/**
 * Macro split from a kcal target + body weight + goal:
 * - Protein from goal-specific g/kg
 * - Fat 0.9 g/kg
 * - Carbs = leftover energy
 * All macro grams use Math.floor (no rounding up leftover crumbs to 1 g).
 * Returns null when kcal is empty/zero or weight is missing (caller should clear macros).
 */
export function macrosFromKcal(
  kcal: number,
  weightKg: number,
  weightGoal: WeightGoal = 'maintain'
): Pick<GoalCalcResult, 'carbs' | 'protein' | 'fat'> | null {
  if (!(kcal > 0) || !(weightKg > 0)) return null;

  const proteinPerKg = PROTEIN_G_PER_KG_BY_GOAL[weightGoal];
  let protein = Math.floor(weightKg * proteinPerKg);
  let fat = Math.floor(weightKg * FAT_G_PER_KG);
  let proteinKcal = protein * 4;
  let fatKcal = fat * 9;

  // Kcal too low for the g/kg targets: scale P+F down so they fit (carbs usually 0)
  if (proteinKcal + fatKcal > kcal) {
    const scale = kcal / (proteinKcal + fatKcal);
    protein = Math.floor(protein * scale);
    fat = Math.floor(fat * scale);
    proteinKcal = protein * 4;
    fatKcal = fat * 9;
  }

  const carbs = Math.floor(Math.max(0, kcal - proteinKcal - fatKcal) / 4);
  return { protein, fat, carbs };
}

/** Carbs grams that fill remaining kcal after protein + fat. */
export function carbsToFillKcal(kcal: number, protein: number, fat: number): number {
  if (!(kcal > 0)) return 0;
  return Math.floor(Math.max(0, kcal - protein * 4 - fat * 9) / 4);
}

/** Kcal implied by current macro grams. */
export function kcalFromMacros(protein: number, carbs: number, fat: number): number {
  return Math.round(macroGramsToKcal(protein, carbs, fat));
}

/**
 * Apply cascade / empty-field autocomplete when one goal field changes.
 * WHAT: Same math for sliders and text fields.
 * HOW: kcal→all macros; P/F→carbs fill; carbs→kcal; if a sibling is empty, fill it.
 */
export function applyGoalFieldChange(
  fields: GoalFields,
  changed: GoalFieldKey,
  nextRaw: string,
  weightKg: number,
  weightGoal: WeightGoal = 'maintain'
): GoalFields {
  const next: GoalFields = { ...fields, [changed]: nextRaw };

  const kcalN = parseOptionalGrams(next.kcal);
  const proteinN = parseOptionalGrams(next.protein);
  const carbsN = parseOptionalGrams(next.carbs);
  const fatN = parseOptionalGrams(next.fat);

  // Step 1: primary cascade for the field the user edited
  if (changed === 'kcal') {
    const kcal = kcalN ?? 0;
    if (kcal > 0 && weightKg > 0) {
      const macros = macrosFromKcal(kcal, weightKg, weightGoal);
      if (macros) {
        next.protein = String(macros.protein);
        next.fat = String(macros.fat);
        next.carbs = String(macros.carbs);
        return next;
      }
    }
    if (!(kcal > 0)) {
      next.protein = '';
      next.fat = '';
      next.carbs = '';
    }
    return next;
  }

  if (changed === 'protein' || changed === 'fat') {
    // Protein/fat change → carbs fill remaining kcal when kcal is known
    if (kcalN != null && kcalN > 0 && proteinN != null && fatN != null) {
      next.carbs = String(carbsToFillKcal(kcalN, proteinN, fatN));
    } else if (carbsN === null && kcalN != null && kcalN > 0) {
      // Empty carbs + sibling change → fill carbs
      const p = proteinN ?? 0;
      const f = fatN ?? 0;
      if (proteinN != null || fatN != null) {
        next.carbs = String(carbsToFillKcal(kcalN, p, f));
      }
    }
  }

  if (changed === 'carbs') {
    if (proteinN != null && carbsN != null && fatN != null) {
      next.kcal = String(kcalFromMacros(proteinN, carbsN, fatN));
    }
  }

  // Step 2: empty-field autocomplete when another field changed
  const emptyKeys = (['protein', 'carbs', 'fat'] as const).filter((k) => next[k].trim() === '');
  if (emptyKeys.length === 1 && changed !== emptyKeys[0]) {
    const missing = emptyKeys[0];
    const k = parseOptionalGrams(next.kcal) ?? 0;
    const p = parseOptionalGrams(next.protein);
    const c = parseOptionalGrams(next.carbs);
    const f = parseOptionalGrams(next.fat);

    if (missing === 'carbs' && k > 0 && p != null && f != null) {
      next.carbs = String(carbsToFillKcal(k, p, f));
    } else if (missing === 'protein' && k > 0 && c != null && f != null) {
      const grams = Math.floor(Math.max(0, k - c * 4 - f * 9) / 4);
      next.protein = String(grams);
    } else if (missing === 'fat' && k > 0 && p != null && c != null) {
      const grams = Math.floor(Math.max(0, k - p * 4 - c * 4) / 9);
      next.fat = String(grams);
    }
  }

  return next;
}

export function calculateDailyGoals(input: GoalCalcInput): GoalCalcResult | null {
  const { weightKg, heightCm, ageYears, gender, activity, weightGoal } = input;
  // Soft UX messages are separate; here we only need positive body stats + a usable age for Mifflin
  if (!(weightKg > 0) || !(heightCm > 0) || !(ageYears > 0)) {
    return null;
  }

  const soft = softBodyValidation(heightCm, weightKg);
  if (soft) return null;

  const bmr = estimateBmr({ weightKg, heightCm, ageYears, gender });
  const tdee = Math.round(bmr * ACTIVITY_FACTORS[activity]);
  const kcal = Math.max(1200, tdee + WEIGHT_GOAL_KCAL_DELTA[weightGoal]);
  const macros = macrosFromKcal(kcal, weightKg, weightGoal);
  if (!macros) return null;
  return { kcal, ...macros };
}
