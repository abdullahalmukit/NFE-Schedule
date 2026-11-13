import { describe, expect, it } from "vitest";
import { bn } from "./bn";
import { en } from "./en";
import { DEFAULT_LOCALE, FALLBACK_LOCALE, isLocale, resolveLocale, t } from "./index";

describe("i18n", () => {
  it("defaults to English and falls back to English", () => {
    expect(DEFAULT_LOCALE).toBe("en");
    expect(FALLBACK_LOCALE).toBe("en");
  });

  it("has the same keys in both languages", () => {
    expect(Object.keys(bn).sort()).toEqual(Object.keys(en).sort());
  });

  it("translates and prefers admin overrides", () => {
    expect(t("en", "app.tagline")).toBe(en["app.tagline"]);
    expect(t("bn", "app.tagline")).toBe(bn["app.tagline"]);
    expect(t("en", "app.name", { "app.name": "X" })).toBe("X");
  });

  it("validates locales", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("bn")).toBe(true);
    expect(isLocale("bn-BD")).toBe(false);
    expect(isLocale(null)).toBe(false);
  });
});

describe("resolveLocale", () => {
  it("is English with nothing saved", () => {
    expect(resolveLocale({})).toBe("en");
  });

  it("uses the saved choice (profile or guest device)", () => {
    expect(resolveLocale({ saved: "bn" })).toBe("bn");
    expect(resolveLocale({ saved: "en", adminDefault: "bn" })).toBe("en");
  });

  it("uses the admin default when nothing is saved", () => {
    expect(resolveLocale({ adminDefault: "bn" })).toBe("bn");
  });

  it("ignores invalid values", () => {
    expect(resolveLocale({ saved: "fr", adminDefault: "xx" })).toBe("en");
  });
});
