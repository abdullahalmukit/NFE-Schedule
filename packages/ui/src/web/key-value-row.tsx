import { cx } from "./cx";

export interface KeyValueRowProps {
  label: string;
  value: string;
  /** Accent value ("None" in the Checks panel). */
  good?: boolean;
}

export function KeyValueRow({ label, value, good }: KeyValueRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border py-2.5 last:border-b-0">
      <span className="font-body text-body text-text">{label}</span>
      <span className={cx("font-body text-body font-semibold", good ? "text-accent" : "text-text")}>
        {value}
      </span>
    </div>
  );
}
