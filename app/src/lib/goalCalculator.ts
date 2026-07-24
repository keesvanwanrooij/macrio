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

export type MacroPercents = { protein: number; carbs: number; fat: number };

/** Unified default % of daily kcal (carbs / protein / fat). */
export const DEFAULT_MACRO_PERCENTS: MacroPercents = {
  carbs: 50,
  protein: 20,
  fat: 30,
};

/** Default % slider rail max. Grows if a macro exceeds this (ring spill). */
export const PERCENT_SLIDER_MAX = 100;

/** Soft unusual ranges (warn only; Mifflin still runs). */
export const HEIGHT_CM_SOFT = { min: 100, max: 230 } as const;
export const WEIGHT_KG_SOFT = { min: 30, max: 250 } as const;
/** Soft warn when age is under this (years); Mifflin still runs when age > 0. */
export const AGE_YEARS_SOFT_UNDER = 16;

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
  /**
   * Mifflin breakdown for the calculator footer (only set by calculateDailyGoals).
   * bmr → × activity = tdee → ± goal delta = kcal.
   */
  energy?: {
    bmr: number;
    activityFactor: number;
    tdee: number;
    goalDelta: number;
  };
};

export type BodyMetricsDraft = {
  date_of_birth: string;
  height_cm: number;
  weight_kg: number;
  gender: Gender;
  activity_level: ActivityLevel;
  weight_goal: WeightGoal;
};

export type BodyMetricHardError = 'negative' | 'nonPositive';

/** Soft vs hard copy under weight/height/age fields (i18n key + severity). */
export type BodyFieldMessage = { severity: 'hard' | 'soft'; key: string };

export type GoalFieldKey = 'kcal' | 'protein' | 'carbs' | 'fat';

export type GoalFields = {
  kcal: string;
  protein: string;
  carbs: string;
  fat: string;
};

/** Empty editor draft (onboarding start / cleared goals). */
export const EMPTY_GOAL_FIELDS: GoalFields = { kcal: '', protein: '', carbs: '', fat: '' };

/** Profile + goal_revisions columns for daily targets. */
export type GoalNumberPatch = {
  goal_kcal: number | null;
  goal_carbs: number | null;
  goal_protein: number | null;
  goal_fat: number | null;
};

export const NULL_GOAL_NUMBERS: GoalNumberPatch = {
  goal_kcal: null,
  goal_carbs: null,
  goal_protein: null,
  goal_fat: null,
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

/**
 * Hard field error for weight/height.
 * Empty input → null. Only negative / ≤0 block calculation.
 */
export function bodyMetricHardError(raw: string, value: number): BodyMetricHardError | null {
  if (raw.trim() === '') return null;
  if (!Number.isFinite(value)) return 'nonPositive';
  if (value < 0) return 'negative';
  if (!(value > 0)) return 'nonPositive';
  return null;
}

/** Soft: height outside usual adult range (still calculates). */
export function softHeightUnusual(heightCm: number): boolean {
  return heightCm > 0 && (heightCm < HEIGHT_CM_SOFT.min || heightCm > HEIGHT_CM_SOFT.max);
}

/** Soft: weight outside usual adult range (still calculates). */
export function softWeightUnusual(weightKg: number): boolean {
  return weightKg > 0 && (weightKg < WEIGHT_KG_SOFT.min || weightKg > WEIGHT_KG_SOFT.max);
}

/** Soft: under 16 (encourage talking to a trusted person; still calculates when age > 0). */
export function softAgeYoung(ageYears: number): boolean {
  return ageYears > 0 && ageYears < AGE_YEARS_SOFT_UNDER;
}

/** i18n key for a hard weight/height/age field error. */
export function bodyMetricHardI18nKey(
  kind: 'weight' | 'height' | 'age',
  err: BodyMetricHardError
): string {
  if (err === 'negative') {
    if (kind === 'weight') return 'goalsCalc.weightNegative';
    if (kind === 'height') return 'goalsCalc.heightNegative';
    return 'goalsCalc.ageNegative';
  }
  if (kind === 'weight') return 'goalsCalc.weightNonPositive';
  if (kind === 'height') return 'goalsCalc.heightNonPositive';
  return 'goalsCalc.ageNonPositive';
}

/**
 * Weight field copy after blur: hard ≤0 first, else soft unusual range.
 * Shared by Settings + onboarding (GoalCalculator has its own height/age rows).
 */
export function weightFieldMessage(raw: string, weightKg: number): BodyFieldMessage | null {
  const hard = bodyMetricHardError(raw, weightKg);
  if (hard) return { severity: 'hard', key: bodyMetricHardI18nKey('weight', hard) };
  if (softWeightUnusual(weightKg)) return { severity: 'soft', key: 'goalsCalc.softWeight' };
  return null;
}

/** Slider max for % bars: at least 100, or the highest current percentage. */
export function percentScaleMax(percents: MacroPercents): number {
  return Math.max(PERCENT_SLIDER_MAX, percents.protein, percents.carbs, percents.fat);
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
    PERCENT_SLIDER_MAX,
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
 * Rescale macros for a new kcal while keeping the current C/P/F split.
 * Falls back to default 50/20/30 only when there is no usable split yet.
 * Does not force a reset (user uses “Macro's resetten” for that).
 */
export function goalsFromKcalKeepingSplit(kcal: number, current: GoalFields, kcalRaw?: string): GoalFields {
  const raw = kcalRaw ?? String(kcal);
  if (!(kcal > 0)) {
    return { kcal: raw, protein: '0', carbs: '0', fat: '0' };
  }
  const protein = parseGoalFieldNumber(current.protein);
  const carbs = parseGoalFieldNumber(current.carbs);
  const fat = parseGoalFieldNumber(current.fat);
  const hasMacros =
    Number.isFinite(protein) &&
    protein >= 0 &&
    Number.isFinite(carbs) &&
    carbs >= 0 &&
    Number.isFinite(fat) &&
    fat >= 0 &&
    (protein > 0 || carbs > 0 || fat > 0);
  if (hasMacros) {
    const fromGrams = percentsFromGrams(parseGoalFieldNumber(current.kcal) || kcal, protein, carbs, fat);
    const percents = isReliablePercentSplit(fromGrams) ? fromGrams : DEFAULT_MACRO_PERCENTS;
    return { ...goalsFromPercents(kcal, percents), kcal: raw };
  }
  return { ...goalsFromPercents(kcal, DEFAULT_MACRO_PERCENTS), kcal: raw };
}

/**
 * Shared Calorieën text field (Settings / onboarding) when Macro's panel is closed.
 * Empty → clear macro grams. Positive → keep current %. Returns null to ignore invalid input.
 */
export function goalFieldsFromKcalInput(raw: string, current: GoalFields): GoalFields | null {
  if (raw.trim() === '') {
    return { ...current, kcal: raw, protein: '', carbs: '', fat: '' };
  }
  const n = Number(String(raw).replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return null;
  if (n > 0) return goalsFromKcalKeepingSplit(n, current, raw);
  return { ...current, kcal: raw };
}

/** Parse one goal text field (comma or dot decimals). NaN if empty/invalid. */
function parseGoalFieldNumber(raw: string): number {
  const t = raw.trim();
  if (t === '') return NaN;
  const n = Number(String(t).replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
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

/** True when kcal > 0 and each macro gram is a finite number ≥ 0 (0 g allowed). */
export function goalsFieldsComplete(fields: GoalFields): boolean {
  const kcal = parseGoalFieldNumber(fields.kcal);
  if (!(Number.isFinite(kcal) && kcal > 0)) return false;
  return (['protein', 'carbs', 'fat'] as const).every((key) => {
    const n = parseGoalFieldNumber(fields[key]);
    return Number.isFinite(n) && n >= 0;
  });
}

/**
 * True when draft numbers differ from saved profile goal columns.
 * Used to skip no-op flushes when leaving Doelen / switching Berekenen·Macro's.
 */
export function goalsFieldsDirty(
  draft: GoalFields,
  saved: {
    goal_kcal: number | null;
    goal_carbs: number | null;
    goal_protein: number | null;
    goal_fat: number | null;
  }
): boolean {
  if (goalsFieldsAllEmpty(draft)) {
    // Any saved goal column (including explicit 0 g) counts as something to clear
    return (
      saved.goal_kcal != null ||
      saved.goal_carbs != null ||
      saved.goal_protein != null ||
      saved.goal_fat != null
    );
  }
  const next = goalNumbersFromFields(draft);
  return (
    next.goal_kcal !== (saved.goal_kcal ?? null) ||
    next.goal_carbs !== (saved.goal_carbs ?? null) ||
    next.goal_protein !== (saved.goal_protein ?? null) ||
    next.goal_fat !== (saved.goal_fat ?? null)
  );
}

/**
 * Map editor strings → profile/revision numbers.
 * Empty → null. Kcal must be > 0. Macro grams may be 0 (e.g. 100% carbs).
 */
export function goalNumbersFromFields(fields: GoalFields): GoalNumberPatch {
  const toKcal = (raw: string): number | null => {
    const n = parseGoalFieldNumber(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const toMacroGrams = (raw: string): number | null => {
    if (raw.trim() === '') return null;
    const n = parseGoalFieldNumber(raw);
    return Number.isFinite(n) && n >= 0 ? n : null;
  };
  return {
    goal_kcal: toKcal(fields.kcal),
    goal_carbs: toMacroGrams(fields.carbs),
    goal_protein: toMacroGrams(fields.protein),
    goal_fat: toMacroGrams(fields.fat),
  };
}

/** Body draft → profile columns (onboarding + Settings calculator save). */
export function bodyMetricsToProfilePatch(body: BodyMetricsDraft) {
  return {
    date_of_birth: body.date_of_birth,
    height_cm: body.height_cm,
    weight_kg: body.weight_kg,
    gender: body.gender,
    activity_level: body.activity_level,
    weight_goal: body.weight_goal,
  };
}

export function calculateDailyGoals(input: GoalCalcInput): GoalCalcResult | null {
  const { weightKg, heightCm, ageYears, gender, activity, weightGoal } = input;
  // Hard gate only: positive weight, height, age. Soft unusual ranges still calculate.
  if (!(weightKg > 0) || !(heightCm > 0) || !(ageYears > 0)) {
    return null;
  }

  const activityFactor = ACTIVITY_FACTORS[activity];
  const goalDelta = WEIGHT_GOAL_KCAL_DELTA[weightGoal];
  const bmr = Math.round(estimateBmr({ weightKg, heightCm, ageYears, gender }));
  const tdee = Math.round(bmr * activityFactor);
  const kcal = Math.max(1200, tdee + goalDelta);
  // Default 50/20/30 via shared grams helper (same path as goalsFromPercents)
  return {
    ...gramsFromPercents(kcal, DEFAULT_MACRO_PERCENTS),
    energy: { bmr, activityFactor, tdee, goalDelta },
  };
}
