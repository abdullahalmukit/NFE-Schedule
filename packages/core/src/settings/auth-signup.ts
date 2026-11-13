import { z } from "zod";
import type { Locale } from "../i18n";

/**
 * `app_settings.auth.signup` (AUTH-1, AUTH-8, AUTH-9). Public: the apps read it
 * to decide which sign-in buttons to show and which domain hint / rejection
 * message to display. The server-side rule lives in hook_before_user_created.
 */
export const authSignupSchema = z.object({
  domain_mode: z.enum(["restricted", "any"]),
  allowed_domains: z.array(z.string().trim().toLowerCase().min(1)),
  auto_register: z.boolean(),
  google: z.boolean(),
  email_otp: z.boolean(),
  message_en: z.string(),
  message_bn: z.string(),
});

export type AuthSignupSettings = z.infer<typeof authSignupSchema>;

export const AUTH_SIGNUP_DEFAULTS: AuthSignupSettings = {
  domain_mode: "restricted",
  allowed_domains: ["diu.edu.bd"],
  auto_register: true,
  google: true,
  email_otp: false,
  message_en: "This email address cannot be used to sign up.",
  message_bn: "এই ইমেইল দিয়ে নিবন্ধন করা যাবে না।",
};

/** Merges a stored value over the defaults; anything invalid falls back to the default. */
export function parseAuthSignup(value: unknown): AuthSignupSettings {
  const merged = { ...AUTH_SIGNUP_DEFAULTS, ...(typeof value === "object" && value ? value : {}) };
  const parsed = authSignupSchema.safeParse(merged);
  return parsed.success ? parsed.data : AUTH_SIGNUP_DEFAULTS;
}

/** "@diu.edu.bd" or "@diu.edu.bd / @example.edu" when only listed domains may register; else null. */
export function domainHint(cfg: AuthSignupSettings): string | null {
  if (cfg.domain_mode !== "restricted" || cfg.allowed_domains.length === 0) return null;
  return cfg.allowed_domains.map((d) => `@${d}`).join(" / ");
}

/** The admin's rejection message in the user's language. */
export function rejectionMessage(cfg: AuthSignupSettings, locale: Locale): string {
  return (locale === "bn" ? cfg.message_bn : cfg.message_en) || cfg.message_en;
}

/**
 * True when a sign-in error came from the sign-up rule: the hook answers with
 * the admin's English message, which Supabase passes on (possibly URL-encoded).
 */
export function isSignupRefusal(
  cfg: AuthSignupSettings,
  errorText: string | null | undefined,
): boolean {
  if (!errorText || !cfg.message_en) return false;
  let text = errorText.replace(/\+/g, " ");
  try {
    text = decodeURIComponent(text);
  } catch {
    // keep the raw text
  }
  return text.toLowerCase().includes(cfg.message_en.toLowerCase());
}
