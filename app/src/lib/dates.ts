/*
 * SECTION: Date format preference + formatting helpers
 * WHAT: Profile date_format (DD-MM-YYYY default) applied wherever dates are shown.
 * HOW: formatDateDisplay / parseDisplayDate; clamp to today; week-start Monday helper.
 * INPUT: ISO YYYY-MM-DD strings + DateFormat preference
 * OUTPUT: display strings; clamped ISO dates
 */

export type DateFormat = 'DD-MM-YYYY' | 'YYYY-MM-DD' | 'MM-DD-YYYY';

export const DATE_FORMATS: DateFormat[] = ['DD-MM-YYYY', 'YYYY-MM-DD', 'MM-DD-YYYY'];

export function isDateFormat(value: unknown): value is DateFormat {
  return value === 'DD-MM-YYYY' || value === 'YYYY-MM-DD' || value === 'MM-DD-YYYY';
}

/** Normalize profile value; default DD-MM-YYYY when missing/invalid. */
export function resolveDateFormat(value: unknown): DateFormat {
  return isDateFormat(value) ? value : 'DD-MM-YYYY';
}

/** Format ISO YYYY-MM-DD for UI using the user's preference. */
export function formatDateDisplay(iso: string, format: DateFormat = 'DD-MM-YYYY'): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
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

/** Never allow a diary/report anchor after today. */
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

export function addDaysIso(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return toDateString(d);
}

/** Parse Date → ISO using local calendar (picker values). */
export function dateToIso(d: Date): string {
  return toDateString(d);
}

/** ISO → Date at local noon (avoids DST edge shifts). */
export function isoToDate(iso: string): Date {
  return new Date(iso + 'T12:00:00');
}
