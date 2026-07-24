/*
 * SECTION: Locale-aware number display
 * WHAT: Format decimals with the device’s . or , (not hardcoded dots).
 * HOW: Use expo-localization languageTag + toLocaleString.
 * INPUT: number + optional fraction digits
 * OUTPUT: display string for UI (never for DB storage)
 */
import * as Localization from 'expo-localization';

/** Device BCP-47 tag (e.g. nl-NL, en-US) for number formatting. */
function deviceLocale(): string {
  return Localization.getLocales()[0]?.languageTag ?? 'en-US';
}

/** System decimal separator (`,` on many EU devices, `.` on US). */
export function decimalSeparator(): '.' | ',' {
  const sample = (1.1).toLocaleString(deviceLocale());
  return sample.includes(',') ? ',' : '.';
}

/**
 * Format a number for on-screen display using system decimal separator.
 * Example: 1.55 → "1,55" on many EU devices, "1.55" on US.
 */
export function formatLocaleNumber(
  value: number,
  options?: {
    maximumFractionDigits?: number;
    minimumFractionDigits?: number;
  }
): string {
  if (!Number.isFinite(value)) return String(value);
  return value.toLocaleString(deviceLocale(), {
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
    minimumFractionDigits: options?.minimumFractionDigits,
  });
}

/**
 * Format weight/height for editable fields (system decimal; drop useless trailing zeros).
 * Avoids rewriting user-typed "72,5" into "72.5" when seeding from a number.
 */
export function formatLocaleMetric(value: number, maxFractionDigits = 2): string {
  if (!Number.isFinite(value)) return '';
  return formatLocaleNumber(value, {
    maximumFractionDigits: maxFractionDigits,
    minimumFractionDigits: 0,
  });
}
