/*
 * SECTION: EU-14 allergen keys + diary contains helpers + chip labels
 * WHAT: Canonical allergen keys, OFF tag map, diary contains hits, state-aware labels.
 * HOW: diaryContainsHits uses product/quick-add maps. allergenChipLabel always
 *      returns the full state phrase; chips may shrink font to 0.7 to fit.
 * INPUT: diary entry, user allergen keys, optional version allergens map, i18n t()
 * OUTPUT: contains keys for red diary pills; chip label strings for UI
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

/**
 * Which of the user's selected allergens this diary row contains.
 * Product rows: version map state === 'contains'.
 * Quick-add: entry.allergens[key] === 'contains' (free / unknown ignored).
 */
export function diaryContainsHits(
  entry: DiaryEntry,
  userAllergens: readonly string[],
  versionAllergens: Record<string, AllergenState> | null | undefined
): string[] {
  if (userAllergens.length === 0) return [];
  if (entry.product_version_id) {
    if (!versionAllergens) return [];
    return userAllergens.filter((key) => versionAllergens[key] === 'contains');
  }
  const map = entry.allergens ?? {};
  return userAllergens.filter((key) => map[key] === 'contains');
}

/** Short allergen name (settings / onboarding / stripped chip). */
export function allergenShortLabel(t: TFunction, key: string): string {
  return t(`allergens.${key}`);
}

/** Full state phrase, e.g. Bevat gluten / Glutenvrij / Gluten onbekend. */
export function allergenFullStateLabel(t: TFunction, key: string, state: AllergenState): string {
  return t(`allergens.${key}_${state}`);
}

/**
 * Chip text: always the full state phrase (Bevat X / Xvrij / X onbekend).
 * Long labels rely on adjustsFontSizeToFit (min 0.7), not stripping words.
 */
export function allergenChipLabel(t: TFunction, key: string, state: AllergenState): string {
  return allergenFullStateLabel(t, key, state);
}
