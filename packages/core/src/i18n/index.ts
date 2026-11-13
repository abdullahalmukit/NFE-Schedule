import { bn } from "./bn";
import { en, type MessageKey } from "./en";

export type Locale = "en" | "bn";
export type { MessageKey };

export const LOCALES: readonly Locale[] = ["en", "bn"];

/**
 * Language for new users and guests (ME-7): English. The admin can change it
 * with `app_settings.i18n.default_locale`. The phone's language is never used.
 */
export const DEFAULT_LOCALE: Locale = "en";

/** Used when a string is missing in the chosen language. */
export const FALLBACK_LOCALE: Locale = "en";

const messages: Record<Locale, Partial<Record<MessageKey, string>>> = { en, bn };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Picks the language to show.
 * - `saved`: the user's own choice — `profiles.locale` when signed in,
 *   the device `kv` value for guests.
 * - `adminDefault`: `app_settings.i18n.default_locale`.
 * Invalid or missing values fall through to the next source, then to English.
 */
export function resolveLocale(input: { saved?: unknown; adminDefault?: unknown }): Locale {
  if (isLocale(input.saved)) return input.saved;
  if (isLocale(input.adminDefault)) return input.adminDefault;
  return DEFAULT_LOCALE;
}

/** Looks up a string; admin overrides (`i18n_overrides`) win, English is the fallback. */
export function t(
  locale: Locale,
  key: MessageKey,
  overrides?: Partial<Record<MessageKey, string>>,
): string {
  return overrides?.[key] ?? messages[locale][key] ?? messages[FALLBACK_LOCALE][key] ?? key;
}
