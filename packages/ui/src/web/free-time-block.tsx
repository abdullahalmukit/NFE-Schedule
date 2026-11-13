export interface FreeTimeBlockProps {
  label: string;
  /** "09:50 – 02:40" */
  range: string;
  /** "4 h 50 min" */
  duration: string;
}

export function FreeTimeBlock({ label, range, duration }: FreeTimeBlockProps) {
  return (
    <div className="ml-17 flex items-center justify-between gap-3 rounded-card border border-dashed border-border px-4 py-3">
      <div>
        <p className="font-body text-body font-semibold text-text">{label}</p>
        <p className="font-body text-small text-text-muted">{range}</p>
      </div>
      <span className="rounded-lg bg-surface-raised px-2.5 py-1 font-body text-small font-semibold text-text">
        {duration}
      </span>
    </div>
  );
}
