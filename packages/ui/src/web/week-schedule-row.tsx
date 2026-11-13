import { cx } from "./cx";

export interface WeekScheduleItem {
  time: string;
  /** "263-A1" */
  label: string;
  /** The student's own class. */
  highlight?: boolean;
}

export interface WeekScheduleRowProps {
  day: string;
  items: WeekScheduleItem[];
}

/** Teacher screen: day label + time / section pills. */
export function WeekScheduleRow({ day, items }: WeekScheduleRowProps) {
  return (
    <div className="flex gap-3 border-b border-border py-3 last:border-b-0">
      <span className="w-10 shrink-0 pt-1.5 font-body text-small font-semibold text-text-muted">
        {day}
      </span>
      <div className="flex flex-wrap gap-2">
        {items.map((it) => (
          <span
            key={`${it.time}-${it.label}`}
            className={cx(
              "inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 font-body text-small",
              it.highlight ? "bg-accent-soft text-accent" : "bg-surface-raised text-text",
            )}
          >
            <span className={it.highlight ? "" : "text-text-muted"}>{it.time}</span>
            <span className="font-semibold">{it.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
