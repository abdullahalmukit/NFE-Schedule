import { COURSE_TONE_COUNT, type Tone } from "../theme";

/** Tailwind classes for a tone (soft background + coloured text). */
export const toneClass: Record<Tone, string> = {
  neutral: "bg-surface-raised text-text-muted",
  accent: "bg-accent-soft text-accent",
  warning: "bg-warning-soft text-warning",
  info: "bg-info-soft text-info",
  danger: "bg-danger-soft text-danger",
  purple: "bg-purple-soft text-purple",
};

/** CSS variables of course colour `index`; see css.ts. */
export function courseVars(index: number) {
  const i = ((Math.trunc(index) % COURSE_TONE_COUNT) + COURSE_TONE_COUNT) % COURSE_TONE_COUNT;
  return {
    fill: `var(--nfe-course-${i}-fill)`,
    onFill: `var(--nfe-course-${i}-on-fill)`,
    tint: `var(--nfe-course-${i}-tint)`,
    onTint: `var(--nfe-course-${i}-on-tint)`,
  };
}
