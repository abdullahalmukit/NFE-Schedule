import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { contrastRatio, mix } from "./color";
import { buildThemeCss } from "./css";
import { logoMarkSvg } from "./logo";
import {
  COURSE_TONE_COUNT,
  courseTone,
  getTheme,
  resolveThemeName,
  toneColors,
  type ThemeName,
  type Tone,
} from "./theme";

const THEMES: ThemeName[] = ["dark", "light"];
const AA = 4.5;

describe("colour helpers", () => {
  it("mixes and measures contrast", () => {
    expect(mix("#000000", "#FFFFFF", 0.5)).toBe("#808080");
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
  });
});

describe("theme", () => {
  it("follows the system and defaults to dark", () => {
    expect(resolveThemeName("system", "light")).toBe("light");
    expect(resolveThemeName("system", "dark")).toBe("dark");
    expect(resolveThemeName("system", null)).toBe("dark");
    expect(resolveThemeName("light", "dark")).toBe("light");
  });

  it("wraps course colours", () => {
    expect(COURSE_TONE_COUNT).toBe(8);
    expect(courseTone("dark", 9)).toEqual(courseTone("dark", 1));
    expect(courseTone("dark", -1)).toEqual(courseTone("dark", 7));
  });

  // NF-6 / DESIGN_SYSTEM §8: contrast AA in both themes.
  for (const name of THEMES) {
    const c = getTheme(name).color;
    it(`${name}: text colours pass AA`, () => {
      for (const bg of [c.bg, c.surface, c.surfaceRaised]) {
        expect(contrastRatio(c.text, bg)).toBeGreaterThanOrEqual(AA);
        expect(contrastRatio(c.textMuted, bg)).toBeGreaterThanOrEqual(AA);
      }
      expect(contrastRatio(c.onAccent, c.accent)).toBeGreaterThanOrEqual(AA);
    });

    it(`${name}: course colours pass AA`, () => {
      for (let i = 0; i < COURSE_TONE_COUNT; i++) {
        const t = courseTone(name, i);
        expect(contrastRatio(t.onFill, t.fill), `fill ${i}`).toBeGreaterThanOrEqual(AA);
        expect(contrastRatio(t.onTint, t.tint), `tint ${i}`).toBeGreaterThanOrEqual(AA);
      }
    });

    it(`${name}: tone pills pass AA`, () => {
      const tones: Tone[] = ["neutral", "accent", "warning", "info", "danger", "purple"];
      for (const tone of tones) {
        const { bg, fg } = toneColors(name, tone);
        expect(contrastRatio(fg, bg), tone).toBeGreaterThanOrEqual(AA);
      }
    });
  }
});

describe("generated files", () => {
  it("theme.css is up to date (run: pnpm --filter @nfe/ui build:css)", () => {
    const file = readFileSync(fileURLToPath(new URL("./web/theme.css", import.meta.url)), "utf8");
    expect(file.replace(/\r\n/g, "\n")).toBe(buildThemeCss());
  });

  it("logo svg has three squares and a leaf", () => {
    const svg = logoMarkSvg("default");
    expect(svg.match(/<rect/g)?.length).toBe(3);
    expect(svg).toContain("<path");
  });
});
