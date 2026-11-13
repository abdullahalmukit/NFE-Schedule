import { cx } from "./cx";

export interface StepperProps {
  steps: string[];
  /** Index of the current step; earlier steps show as done. */
  current: number;
}

/** Upload → Read tables → Fill missing details → Publish. */
export function Stepper({ steps, current }: StepperProps) {
  return (
    <ol className="flex flex-wrap items-center gap-6">
      {steps.map((s, i) => {
        const state = i < current ? "done" : i === current ? "current" : "todo";
        return (
          <li
            key={s}
            aria-current={state === "current" ? "step" : undefined}
            className="flex items-center gap-2"
          >
            <span
              className={cx(
                "flex h-6 w-6 items-center justify-center rounded-full font-body text-caption font-bold",
                state === "done" && "bg-accent text-on-accent",
                state === "current" && "bg-warning text-bg",
                state === "todo" && "bg-surface-raised text-text-muted",
              )}
            >
              {i + 1}
            </span>
            <span
              className={cx(
                "font-body text-small font-semibold",
                state === "todo" ? "text-text-muted" : "text-text",
              )}
            >
              {s}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
