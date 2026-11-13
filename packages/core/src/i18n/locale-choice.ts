import { isLocale, type Locale } from "./index";

/** Where each platform keeps the language choice (ME-7). */
export interface LocaleChoiceStores {
  /** Signed-in user id, or null for a guest. */
  userId: string | null;
  /** Writes `profiles.locale` for the signed-in user. */
  saveToProfile(userId: string, locale: Locale): Promise<void>;
  /** Writes the guest's choice on this device (phone kv / web cookie). */
  saveToDevice(locale: Locale): Promise<void>;
}

/**
 * Saves the language the user picked in Settings: in their profile when signed
 * in (follows them to every device), otherwise on this device only.
 */
export async function saveLocaleChoice(
  locale: Locale,
  stores: LocaleChoiceStores,
): Promise<"profile" | "device"> {
  if (!isLocale(locale)) throw new Error(`Unknown language: ${String(locale)}`);
  if (stores.userId) {
    await stores.saveToProfile(stores.userId, locale);
    return "profile";
  }
  await stores.saveToDevice(locale);
  return "device";
}
