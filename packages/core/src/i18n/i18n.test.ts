import { describe, expect, it } from "vitest";
import { bn } from "./bn";
import { en } from "./en";
import { DEFAULT_LOCALE, t } from "./index";

describe("i18n", () => {
  it("defaults to Bangla", () => {
    expect(DEFAULT_LOCALE).toBe("bn");
  });

  it("has the same keys in both languages", () => {
    expect(Object.keys(bn).sort()).toEqual(Object.keys(en).sort());
  });

  it("prefers admin overrides", () => {
    expect(t("en", "app.name")).toBe("NFE Schedule");
    expect(t("en", "app.name", { "app.name": "X" })).toBe("X");
  });
});
