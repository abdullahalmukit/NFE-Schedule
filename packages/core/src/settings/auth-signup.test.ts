import { describe, expect, it } from "vitest";
import { authStage } from "../auth/stage";
import {
  AUTH_SIGNUP_DEFAULTS,
  domainHint,
  isSignupRefusal,
  parseAuthSignup,
  rejectionMessage,
} from "./auth-signup";

describe("auth.signup settings", () => {
  it("falls back to defaults for missing or invalid values", () => {
    expect(parseAuthSignup(null)).toEqual(AUTH_SIGNUP_DEFAULTS);
    expect(parseAuthSignup({ domain_mode: "everyone" })).toEqual(AUTH_SIGNUP_DEFAULTS);
    expect(parseAuthSignup({ email_otp: true }).email_otp).toBe(true);
  });

  it("normalises domains", () => {
    expect(parseAuthSignup({ allowed_domains: [" DIU.edu.bd "] }).allowed_domains).toEqual([
      "diu.edu.bd",
    ]);
  });

  it("shows a domain hint only for the restricted rule", () => {
    expect(domainHint(AUTH_SIGNUP_DEFAULTS)).toBe("@diu.edu.bd");
    expect(domainHint({ ...AUTH_SIGNUP_DEFAULTS, allowed_domains: ["a.bd", "b.bd"] })).toBe(
      "@a.bd / @b.bd",
    );
    expect(domainHint({ ...AUTH_SIGNUP_DEFAULTS, domain_mode: "any" })).toBeNull();
  });

  it("gives the rejection message in the user's language", () => {
    expect(rejectionMessage(AUTH_SIGNUP_DEFAULTS, "bn")).toBe(AUTH_SIGNUP_DEFAULTS.message_bn);
    expect(rejectionMessage(AUTH_SIGNUP_DEFAULTS, "en")).toBe(AUTH_SIGNUP_DEFAULTS.message_en);
  });

  it("recognises the hook's refusal, also URL-encoded", () => {
    const msg = AUTH_SIGNUP_DEFAULTS.message_en;
    expect(isSignupRefusal(AUTH_SIGNUP_DEFAULTS, msg)).toBe(true);
    expect(isSignupRefusal(AUTH_SIGNUP_DEFAULTS, encodeURIComponent(`Error: ${msg}`))).toBe(true);
    expect(
      isSignupRefusal(AUTH_SIGNUP_DEFAULTS, "This+email+address+cannot+be+used+to+sign+up."),
    ).toBe(true);
    expect(isSignupRefusal(AUTH_SIGNUP_DEFAULTS, "Network request failed")).toBe(false);
    expect(isSignupRefusal(AUTH_SIGNUP_DEFAULTS, null)).toBe(false);
  });
});

describe("authStage", () => {
  it("routes by session, guest choice and account status", () => {
    expect(authStage({ signedIn: false })).toBe("sign-in");
    expect(authStage({ signedIn: false, guest: true })).toBe("guest");
    expect(authStage({ signedIn: true, status: "pending" })).toBe("pending");
    expect(authStage({ signedIn: true, status: "disabled" })).toBe("disabled");
    expect(authStage({ signedIn: true, status: "active" })).toBe("ready");
    expect(authStage({ signedIn: true, status: "alumni" })).toBe("ready");
    expect(authStage({ signedIn: true, status: null })).toBe("pending");
  });
});
