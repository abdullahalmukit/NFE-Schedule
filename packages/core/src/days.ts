/**
 * Day index used everywhere (database, parser, apps):
 * 0 = Saturday … 6 = Friday, matching the department routine file.
 */
export const DAY_KEYS = [
  "saturday",
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
] as const;

export type DayKey = (typeof DAY_KEYS)[number];
export type DayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Converts a JavaScript `Date#getDay()` value (0 = Sunday) to our day index. */
export function dayIndexFromJsDay(jsDay: number): DayIndex {
  return ((jsDay + 1) % 7) as DayIndex;
}

/** Day index of a calendar date (local time). */
export function dayIndexOf(date: Date): DayIndex {
  return dayIndexFromJsDay(date.getDay());
}
