import type { Tone } from "../theme";
import { cx } from "./cx";
import { toneClass } from "./tone";

export interface PillProps {
  label: string;
  tone?: Tone;
  size?: "sm" | "md";
}

/** Status pill: "In class time" (warning), "Syllabus: …" (neutral), "New" (accent), "Lab" (info). */
export function Pill({ label, tone = "neutral", size = "md" }: PillProps) {
  return (
    <span
      className={cx(
        "inline-flex items-center whitespace-nowrap font-body font-semibold",
        size === "sm"
          ? "rounded-md px-1.5 py-0.5 text-caption"
          : "rounded-lg px-2.5 py-1 text-small",
        toneClass[tone],
      )}
    >
      {label}
    </span>
  );
}
