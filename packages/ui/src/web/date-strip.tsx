import { cx } from "./cx";

export interface DateStripDay {
  key: string;
  /** "7" */
  day: string;
  /** "SAT" */
  weekday: string;
  /** Full date for screen readers, e.g. "Saturday, 7 November". */
  label: string;
}

export interface DateStripProps {
  days: DateStripDay[];
  selected: string;
  onSelect: (key: string) => void;
}

export function DateStrip({ days, selected, onSelect }: DateStripProps) {
  return (
    <div className="flex justify-between gap-0.5 rounded-card bg-surface p-1.5">
      {days.map((d) => {
        const active = d.key === selected;
        return (
          <button
            key={d.key}
            type="button"
            aria-label={d.label}
            aria-pressed={active}
            onClick={() => onSelect(d.key)}
            className={cx(
              "flex h-14 min-w-0 flex-1 flex-col items-center justify-center rounded-xl",
              active ? "bg-accent text-on-accent" : "text-text hover:bg-surface-raised",
            )}
          >
            <span className="font-display text-heading font-bold leading-none">{d.day}</span>
            <span
              className={cx(
                "mt-1 font-body text-caption font-semibold",
                active ? "text-on-accent" : "text-text-muted",
              )}
            >
              {d.weekday}
            </span>
          </button>
        );
      })}
    </div>
  );
}
