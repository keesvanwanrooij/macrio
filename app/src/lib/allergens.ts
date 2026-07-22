/*
 * SECTION: EU-14 allergen keys + diary alert helpers + chip labels
 * WHAT: Canonical allergen keys, OFF tag map, diary contains/may_contain hits,
 *       shared tap cycle, state-aware labels.
 * HOW: diaryAllergenHits reads product or quick-add maps. Interactive chips use
 *      short names + nextAllergenState; read-only UI uses full state phrases.
 * INPUT: diary entry, user allergen keys, optional version allergens map, i18n t()
 * OUTPUT: alert hits for diary pills; chip label strings; next cycle state
 */
import type { TFunction } from 'i18next';

import type { AllergenState, DiaryEntry } from './types';

export const EU_ALLERGENS = [
  'gluten',
  'crustaceans',
  'eggs',
  'fish',
  'peanuts',
  'soybeans',
  'milk',
  'nuts',
  'celery',
  'mustard',
  'sesame',
  'sulphites',
  'lupin',
  'molluscs',
] as const;

export type AllergenKey = (typeof EU_ALLERGENS)[number];

/** Open Food Facts allergen tag → our canonical key */
export const OFF_TAG_MAP: Record<string, AllergenKey> = {
  'en:gluten': 'gluten',
  'en:crustaceans': 'crustaceans',
  'en:eggs': 'eggs',
  'en:fish': 'fish',
  'en:peanuts': 'peanuts',
  'en:soybeans': 'soybeans',
  'en:milk': 'milk',
  'en:nuts': 'nuts',
  'en:celery': 'celery',
  'en:mustard': 'mustard',
  'en:sesame-seeds': 'sesame',
  'en:sulphur-dioxide-and-sulphites': 'sulphites',
  'en:lupin': 'lupin',
  'en:molluscs': 'molluscs',
};

/** Tap cycle for create / quick-add chips (interactive only). */
export const ALLERGEN_STATE_CYCLE: AllergenState[] = [
  'unknown',
  'contains',
  'may_contain',
  'free',
];

export function nextAllergenState(state: AllergenState): AllergenState {
  const i = ALLERGEN_STATE_CYCLE.indexOf(state);
  const from = i < 0 ? 0 : i;
  return ALLERGEN_STATE_CYCLE[(from + 1) % ALLERGEN_STATE_CYCLE.length];
}

export type DiaryAllergenHit = { key: string; state: 'contains' | 'may_contain' };

/**
 * User allergens this diary row contains or may contain (for diary pills).
 * Product rows: version map. Quick-add: entry.allergens. free / unknown ignored.
 */
export function diaryAllergenHits(
  entry: DiaryEntry,
  userAllergens: readonly string[],
  versionAllergens: Record<string, AllergenState> | null | undefined
): DiaryAllergenHit[] {
  if (userAllergens.length === 0) return [];
  const map = entry.product_version_id ? versionAllergens ?? {} : entry.allergens ?? {};
  const hits: DiaryAllergenHit[] = [];
  for (const key of userAllergens) {
    const state = map[key];
    if (state === 'contains' || state === 'may_contain') {
      hits.push({ key, state });
    }
  }
  return hits;
}

/** Short allergen name (settings / onboarding / interactive chips). */
export function allergenShortLabel(t: TFunction, key: string): string {
  return t(`allergens.${key}`);
}

/** Full state phrase, e.g. Bevat gluten / Kan gluten bevatten / Glutenvrij. */
export function allergenFullStateLabel(t: TFunction, key: string, state: AllergenState): string {
  return t(`allergens.${key}_${state}`);
}

/**
 * Chip text: full state phrase by default; short name for interactive create/quick-add.
 */
export function allergenChipLabel(
  t: TFunction,
  key: string,
  state: AllergenState,
  labelMode: 'full' | 'short' = 'full'
): string {
  if (labelMode === 'short') return allergenShortLabel(t, key);
  return allergenFullStateLabel(t, key, state);
}
