import * as SecureStore from "expo-secure-store";
import { isLocale, saveLocaleChoice, type Locale } from "@nfe/core";
import { supabase } from "./supabase";

/**
 * Device key for a guest's language. Kept in secure-store until the local
 * SQLite `kv` table arrives with the offline-sync branch.
 */
const GUEST_LOCALE_KEY = "nfe.locale";

/** Settings → Language (ME-7): profile when signed in, this device for guests. */
export async function saveLocale(locale: Locale): Promise<"profile" | "device"> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return saveLocaleChoice(locale, {
    userId: session?.user.id ?? null,
    async saveToProfile(userId, l) {
      const { error } = await supabase.from("profiles").update({ locale: l }).eq("id", userId);
      if (error) throw error;
    },
    saveToDevice: (l) => SecureStore.setItemAsync(GUEST_LOCALE_KEY, l),
  });
}

/** The guest's saved language on this device, if any. */
export async function readGuestLocale(): Promise<Locale | null> {
  const v = await SecureStore.getItemAsync(GUEST_LOCALE_KEY);
  return isLocale(v) ? v : null;
}
