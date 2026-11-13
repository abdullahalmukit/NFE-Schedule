import { cx } from "./cx";

export interface StatCardProps {
  value: string;
  label: string;
  /** Accent value, e.g. "0" clashes. */
  highlight?: boolean;
}

export function StatCard({ value, label, highlight }: StatCardProps) {
  return (
    <div className="rounded-card bg-surface p-5 shadow-card">
      <p
        className={cx(
          "font-display text-display font-bold",
          highlight ? "text-accent" : "text-text",
        )}
      >
        {value}
      </p>
      <p className="font-body text-small text-text-muted">{label}</p>
    </div>
  );
}
