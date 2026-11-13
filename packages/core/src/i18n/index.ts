import { bn } from "./bn";
import { en, type MessageKey } from "./en";

export type Locale = "bn" | "en";
export type { MessageKey };

/** Default language is Bangla (ME-7). */
export const DEFAULT_LOCALE: Locale = "bn";

const messages: Record<Locale, Record<MessageKey, string>> = { bn, en };

/** Looks up a string; admin overrides (`i18n_overrides`) win when given. */
export function t(
  locale: Locale,
  key: MessageKey,
  overrides?: Partial<Record<MessageKey, string>>,
): string {
  return overrides?.[key] ?? messages[locale][key];
}
