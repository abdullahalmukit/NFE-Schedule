/**
 * Which screen an app session belongs on (AUTH-2, AUTH-8):
 * - "sign-in":  no session and the user has not chosen guest mode → N-1
 * - "guest":    browsing without an account (public data only, RLS enforces it)
 * - "pending":  signed in, waiting for admin approval → N-17
 * - "disabled": signed in, rejected or disabled → N-17 (not-active variant)
 * - "ready":    signed in and active (or alumni, read-only) → onboarding / home
 */
export type AuthStage = "sign-in" | "guest" | "pending" | "disabled" | "ready";

export type ProfileStatus = "pending" | "active" | "alumni" | "disabled";

export function authStage(input: {
  signedIn: boolean;
  status?: ProfileStatus | null;
  guest?: boolean;
}): AuthStage {
  if (!input.signedIn) return input.guest ? "guest" : "sign-in";
  switch (input.status) {
    case "pending":
      return "pending";
    case "disabled":
      return "disabled";
    case "active":
    case "alumni":
      return "ready";
    default:
      // The profile row is created by a trigger with the account; until it is
      // readable treat the user as pending rather than letting them in.
      return "pending";
  }
}
