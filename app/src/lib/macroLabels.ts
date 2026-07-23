/*
 * SECTION: Responsive macro labels
 * WHAT: Diary/report macro labels (kcal may shorten; C/P/F always full words).
 * HOW: kcal uses short on narrow screens; carbs/protein/fat always macros.* full form.
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
  // Always full: NL Koolhydraten / Eiwitten / Vetten
  return t(`macros.${key}`);
}
