/*
 * SECTION: Daily goal calculator (Mifflin-St Jeor + macro heuristics)
 * WHAT: Estimates target kcal and macros from body stats and weight goal.
 * HOW:
 *   1) BMR (Mifflin-St Jeor) × activity factor → TDEE
 *   2) Adjust for goal: lose (−500), maintain (0), gain muscle (+300)
 *   3) Protein g/kg by goal; fat 0.9 g/kg; carbs = remaining kcal
 * INPUT: weight, height, age/DOB, gender, activity, weight goal
 * OUTPUT: { kcal, carbs, protein, fat } or null if inputs invalid
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
  if (!(kcal > 0) || !(weightKg > 0 && weightKg < 400)) return null;

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

export function calculateDailyGoals(input: GoalCalcInput): GoalCalcResult | null {
  const { weightKg, heightCm, ageYears, gender, activity, weightGoal } = input;
  if (
    !(weightKg > 0 && weightKg < 400) ||
    !(heightCm > 0 && heightCm < 300) ||
    !(ageYears >= 12 && ageYears < 120)
  ) {
    return null;
  }

  const bmr = estimateBmr({ weightKg, heightCm, ageYears, gender });
  const tdee = Math.round(bmr * ACTIVITY_FACTORS[activity]);
  const kcal = Math.max(1200, tdee + WEIGHT_GOAL_KCAL_DELTA[weightGoal]);
  const macros = macrosFromKcal(kcal, weightKg, weightGoal);
  if (!macros) return null;
  return { kcal, ...macros };
}
