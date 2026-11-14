import { dayIndexFromJsDay, type DayIndex } from "../days";

/** "YYYY-MM-DD" for a UTC calendar date (dates here carry no time zone). */
export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function utc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

export interface MonthCell {
  date: string;
  day: number;
  inMonth: boolean;
}

/**
 * Weeks of a month for a calendar grid, starting on `startDay`
 * (our index: 0 = Saturday). `month` is 1–12.
 */
export function monthGrid(year: number, month: number, startDay: DayIndex = 0): MonthCell[][] {
  const first = utc(year, month, 1);
  const lead = (dayIndexFromJsDay(first.getUTCDay()) - startDay + 7) % 7;
  const cursor = utc(year, month, 1 - lead);
  const weeks: MonthCell[][] = [];
  do {
    const week: MonthCell[] = [];
    for (let i = 0; i < 7; i++) {
      week.push({
        date: isoDate(cursor),
        day: cursor.getUTCDate(),
        inMonth: cursor.getUTCMonth() === month - 1,
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push(week);
  } while (cursor.getUTCMonth() === month - 1);
  return weeks;
}

/** First and last day of a month as "YYYY-MM-DD". */
export function monthRange(year: number, month: number): { start: string; end: string } {
  return { start: isoDate(utc(year, month, 1)), end: isoDate(utc(year, month + 1, 0)) };
}

/** Parses "YYYY-MM" (falls back to `fallback`). */
export function parseMonth(value: string | undefined, fallback: { year: number; month: number }) {
  const m = value?.match(/^(\d{4})-(\d{2})$/);
  if (!m) return fallback;
  const month = Number(m[2]);
  return month >= 1 && month <= 12 ? { year: Number(m[1]), month } : fallback;
}

export function shiftMonth(
  year: number,
  month: number,
  by: number,
): { year: number; month: number } {
  const d = utc(year, month + by, 1);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 };
}

/** Does a calendar entry (single day or range) cover `date`? */
export function covers(entry: { date: string; end_date: string | null }, date: string): boolean {
  return entry.date <= date && date <= (entry.end_date ?? entry.date);
}
