/**
 * Times, durations and digits as students see them. Times are stored 24 h
 * ("13:10"); by default they are shown as in the department file ("01:10"),
 * or 24 h when the user picks it. Bangla shows Bangla digits.
 */
import { t, type Locale } from "../i18n";

export type TimeStyle = "file" | "24h";

const BANGLA = "০১২৩৪৫৬৭৮৯";

/** "08:20" → "০৮:২০"; other characters are kept. */
export function toBanglaDigits(text: string): string {
  return text.replace(/[0-9]/g, (d) => BANGLA[Number(d)]!);
}

/** Digits in the user's language. */
export function localDigits(text: string | number, locale: Locale): string {
  const s = String(text);
  return locale === "bn" ? toBanglaDigits(s) : s;
}

/** Minutes after midnight of "HH:MM" (also accepts "HH:MM:SS"). */
export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h! * 60 + m!;
}

/** "13:10" → "01:10" (file style, like the routine header) or "13:10" (24 h). */
export function formatTime(time: string, style: TimeStyle = "file", locale: Locale = "en"): string {
  const [hRaw, mRaw] = time.split(":");
  const h = Number(hRaw);
  const hour = style === "24h" ? h : h % 12 === 0 ? 12 : h % 12;
  return localDigits(`${String(hour).padStart(2, "0")}:${mRaw!.slice(0, 2)}`, locale);
}

/** "08:20–09:50" in the chosen style. */
export function formatRange(
  start: string,
  end: string,
  style: TimeStyle = "file",
  locale: Locale = "en",
): string {
  return `${formatTime(start, style, locale)}–${formatTime(end, style, locale)}`;
}

/** 90 → "1 h 30 min" / "১ ঘ ৩০ মি"; 40 → "40 min"; 120 → "2 h". */
export function formatDuration(minutes: number, locale: Locale = "en"): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const text =
    h && m
      ? t(locale, "fmt.duration.hm").replace("{h}", String(h)).replace("{m}", String(m))
      : h
        ? t(locale, "fmt.duration.h").replace("{h}", String(h))
        : t(locale, "fmt.duration.m").replace("{m}", String(m));
  return localDigits(text, locale);
}
