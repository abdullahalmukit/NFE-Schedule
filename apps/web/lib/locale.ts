import { saveLocaleChoice, type Locale } from "@nfe/core";
import { createClient } from "./supabase/client";

/** Cookie holding a guest's language on this browser (readable by server components). */
export const GUEST_LOCALE_COOKIE = "nfe-locale";

/**
 * Settings → Language (ME-7), from a Client Component: signed-in users save to
 * `profiles.locale`, guests to a cookie on this browser.
 */
export async function saveLocale(locale: Locale): Promise<"profile" | "device"> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return saveLocaleChoice(locale, {
    userId: user?.id ?? null,
    async saveToProfile(userId, l) {
      const { error } = await supabase.from("profiles").update({ locale: l }).eq("id", userId);
      if (error) throw error;
    },
    async saveToDevice(l) {
      document.cookie = `${GUEST_LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    },
  });
}
