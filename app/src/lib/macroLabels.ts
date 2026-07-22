/*
 * SECTION: Responsive macro labels
 * WHAT: Full vs short diary/report labels by screen width (same rules everywhere).
 * HOW: width >= 380 → full words; below → short forms (i18n macros.* / *Short).
 * INPUT: i18n t, macro key, compact flag
 * OUTPUT: Localized label string
 */
export const MACRO_COMPACT_WIDTH = 380;

export const MACRO_KEYS = ['kcal', 'carbs', 'protein', 'fat'] as const;
export type MacroKey = (typeof MACRO_KEYS)[number];

export function macroDisplayLabel(
  t: (k: string) => string,
  key: MacroKey,
  compact: boolean
): string {
  if (key === 'kcal') {
    return compact ? t('macros.kcalShort') : t('macros.calories');
  }
  return compact ? t(`macros.${key}Short`) : t(`macros.${key}`);
}
