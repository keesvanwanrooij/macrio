/*
 * SECTION: Date format preference + calendar helpers
 * WHAT: Profile date_format (DD-MM-YYYY default) plus shared ISO calendar math.
 * HOW: formatDateDisplay; isIsoDate; clamp to today; Monday week-start; addDays / toDateString; birthday match.
 * INPUT: ISO YYYY-MM-DD strings + DateFormat preference (or Date for toDateString)
 * OUTPUT: display strings; clamped / shifted ISO dates
 *
 * Single source for diary, reports, NativeDatePicker, and nutrition re-exports.
 */
import type { DateFormat } from './types';

export type { DateFormat };

export const DATE_FORMATS: DateFormat[] = ['DD-MM-YYYY', 'YYYY-MM-DD', 'MM-DD-YYYY'];

/** Calendar day as stored in profiles / diary (local YYYY-MM-DD). */
const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True when `value` is a full ISO calendar date (not a partial typed draft). */
export function isIsoDate(value: string | null | undefined): value is string {
  return ISO_DATE_RE.test((value ?? '').trim());
}

/** Oldest DOB the native pickers allow (shared Settings Account + GoalCalculator). */
export const DOB_PICKER_MIN_ISO = '1920-01-01';
/** Fallback picker value when profile has no DOB yet. */
export const DOB_PICKER_FALLBACK_ISO = '2000-01-01';

export function isDateFormat(value: unknown): value is DateFormat {
  return value === 'DD-MM-YYYY' || value === 'YYYY-MM-DD' || value === 'MM-DD-YYYY';
}

/** Normalize profile value; default DD-MM-YYYY when missing/invalid. */
export function resolveDateFormat(value: unknown): DateFormat {
  return isDateFormat(value) ? value : 'DD-MM-YYYY';
}

/** Format ISO YYYY-MM-DD for UI using the user's preference. */
export function formatDateDisplay(iso: string, format: DateFormat = 'DD-MM-YYYY'): string {
  const m = ISO_DATE_RE.exec(iso.trim());
  if (!m) return iso;
  const [, y, mo, d] = m;
  if (format === 'YYYY-MM-DD') return `${y}-${mo}-${d}`;
  if (format === 'MM-DD-YYYY') return `${mo}-${d}-${y}`;
  return `${d}-${mo}-${y}`;
}

/** Local calendar YYYY-MM-DD. */
export function toDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayIso(): string {
  return toDateString(new Date());
}

/** Never allow a diary/report anchor after today (or after `today` override / max ISO). */
export function clampToToday(iso: string, today: string = todayIso()): string {
  return iso > today ? today : iso;
}

/** Monday of the ISO week containing `iso` (Macrio week charts are Mon–Sun). */
export function weekStartMonday(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return toDateString(d);
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return toDateString(d);
}

/** ISO → Date at local noon (avoids DST edge shifts). */
export function isoToDate(iso: string): Date {
  return new Date(iso + 'T12:00:00');
}

/** True when `dayIso` is the calendar birthday of `dateOfBirth` (month + day; ignores year). */
export function isBirthdayOnDate(dateOfBirth: string | null | undefined, dayIso: string): boolean {
  const dob = ISO_DATE_RE.exec((dateOfBirth ?? '').trim());
  const day = ISO_DATE_RE.exec(dayIso.trim());
  if (!dob || !day) return false;
  return dob[2] === day[2] && dob[3] === day[3];
}

/** Weekday label for nav headers (diary short / reports long). */
export function weekdayLabel(
  iso: string,
  language: string,
  width: 'short' | 'long' | 'narrow' = 'short'
): string {
  const locale = language === 'nl' ? 'nl-NL' : 'en-GB';
  return isoToDate(iso).toLocaleDateString(locale, { weekday: width });
}
