import { describe, expect, it } from "vitest";
import { bn } from "./bn";
import { en } from "./en";
import { DEFAULT_LOCALE, FALLBACK_LOCALE, fill, isLocale, resolveLocale, t } from "./index";
import { saveLocaleChoice } from "./locale-choice";

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

describe("saveLocaleChoice", () => {
  function stores(userId: string | null) {
    const calls: string[] = [];
    return {
      calls,
      userId,
      saveToProfile: async (id: string, l: string) => void calls.push(`profile:${id}:${l}`),
      saveToDevice: async (l: string) => void calls.push(`device:${l}`),
    };
  }

  it("saves to the profile when signed in", async () => {
    const s = stores("u1");
    expect(await saveLocaleChoice("bn", s)).toBe("profile");
    expect(s.calls).toEqual(["profile:u1:bn"]);
  });

  it("saves on the device for a guest", async () => {
    const s = stores(null);
    expect(await saveLocaleChoice("bn", s)).toBe("device");
    expect(s.calls).toEqual(["device:bn"]);
  });

  it("refuses unknown languages", async () => {
    await expect(saveLocaleChoice("fr" as "en", stores(null))).rejects.toThrow();
  });
});

describe("fill", () => {
  it("replaces known placeholders only", () => {
    expect(fill("Use your {domains} email", { domains: "@diu.edu.bd" })).toBe(
      "Use your @diu.edu.bd email",
    );
    expect(fill("{a} {b}", { a: 1 })).toBe("1 {b}");
  });
});
