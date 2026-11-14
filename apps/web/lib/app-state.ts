import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import {
  authStage,
  parseAuthSignup,
  resolveLocale,
  type AuthSignupSettings,
  type AuthStage,
  type Locale,
  type ProfileStatus,
} from "@nfe/core";
import { GUEST_LOCALE_COOKIE } from "./locale";
import { createClient } from "./supabase/server";

/** Set when someone chooses "Browse routine without signing in" (AUTH-2). */
export const GUEST_COOKIE = "nfe-guest";

export interface AppState {
  stage: AuthStage;
  locale: Locale;
  signup: AuthSignupSettings;
  user: { id: string; email: string; fullName: string | null; status: ProfileStatus | null } | null;
}

/** Who is looking, in which language, and the public sign-in settings (once per request). */
export const getAppState = cache(async (): Promise<AppState> => {
  const supabase = await createClient();
  const cookieStore = await cookies();

  const [{ data: auth }, { data: settings }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["auth.signup", "i18n.default_locale"]),
  ]);
  const setting = (key: string) => settings?.find((s) => s.key === key)?.value;

  let user: AppState["user"] = null;
  let savedLocale: string | undefined = cookieStore.get(GUEST_LOCALE_COOKIE)?.value;
  if (auth.user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name, status, locale")
      .eq("id", auth.user.id)
      .maybeSingle();
    user = {
      id: auth.user.id,
      email: profile?.email ?? auth.user.email ?? "",
      fullName: profile?.full_name ?? null,
      status: profile?.status ?? null,
    };
    savedLocale = profile?.locale ?? savedLocale;
  }

  return {
    stage: authStage({
      signedIn: Boolean(user),
      status: user?.status,
      guest: cookieStore.get(GUEST_COOKIE)?.value === "1",
    }),
    locale: resolveLocale({ saved: savedLocale, adminDefault: setting("i18n.default_locale") }),
    signup: parseAuthSignup(setting("auth.signup")),
    user,
  };
});

/** Where a signed-in or guest visitor belongs after signing in. */
export function pathForStage(stage: AuthStage): string {
  switch (stage) {
    case "sign-in":
      return "/sign-in";
    case "pending":
    case "disabled":
      return "/pending";
    default:
      return "/";
  }
}
