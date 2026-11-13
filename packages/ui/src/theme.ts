import { mix } from "./color";
import { tokens } from "./tokens";

export type ThemeName = "dark" | "light";
/** User setting (ME-8): follow the system by default. */
export type ThemePreference = "system" | ThemeName;

export type ColorName = keyof typeof tokens.color.dark;
export type ThemeColors = Record<ColorName, string>;

/** Pill / icon tones shared by web and mobile components. */
export type Tone = "neutral" | "accent" | "warning" | "info" | "danger" | "purple";

export interface CourseTone {
  /** Card fill (routine class card). */
  fill: string;
  onFill: string;
  /** Tinted tile on a surface (home time tile). */
  tint: string;
  onTint: string;
}

const colors: Record<ThemeName, ThemeColors> = {
  dark: tokens.color.dark,
  light: tokens.color.light,
};

export const COURSE_TONE_COUNT = tokens.color.coursePalette.dark.length;

/** Colours for course `index` (wraps around the palette). */
export function courseTone(theme: ThemeName, index: number): CourseTone {
  const n = COURSE_TONE_COUNT;
  const i = ((Math.trunc(index) % n) + n) % n;
  const dark = tokens.color.coursePalette.dark[i] ?? tokens.color.coursePalette.dark[0];
  const light = tokens.color.coursePalette.light[i] ?? tokens.color.coursePalette.light[0];
  const c = colors[theme];
  if (theme === "dark") {
    return {
      fill: dark,
      onFill: c.text,
      tint: mix(dark, c.surface, 0.45),
      onTint: mix(dark, "#FFFFFF", 0.6),
    };
  }
  return { fill: light, onFill: c.text, tint: light, onTint: mix(dark, "#000000", 0.25) };
}

/** Background / foreground pair for a tone. */
export function toneColors(theme: ThemeName, tone: Tone): { bg: string; fg: string } {
  const c = colors[theme];
  switch (tone) {
    case "accent":
      return { bg: c.accentSoft, fg: c.accent };
    case "warning":
      return { bg: c.warningSoft, fg: c.warning };
    case "info":
      return { bg: c.infoSoft, fg: c.info };
    case "danger":
      return { bg: c.dangerSoft, fg: c.danger };
    case "purple":
      return { bg: c.purpleSoft, fg: c.purple };
    default:
      return { bg: c.surfaceRaised, fg: c.textMuted };
  }
}

/** Unknown system scheme falls back to dark, the default look of the mockups. */
export function resolveThemeName(
  preference: ThemePreference,
  system: string | null | undefined,
): ThemeName {
  if (preference !== "system") return preference;
  return system === "light" ? "light" : "dark";
}

export function getTheme(name: ThemeName) {
  return {
    name,
    color: colors[name],
    radius: tokens.radius,
    space: tokens.space,
    size: tokens.size,
    layout: tokens.layout,
    motion: tokens.motion,
  };
}

export type Theme = ReturnType<typeof getTheme>;
