import { cx } from "./cx";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
}

/** Daily / Weekly switch. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
}: SegmentedControlProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-2xl bg-surface p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
          className={cx(
            "h-11 flex-1 rounded-xl font-body text-body font-semibold transition-colors",
            o.value === value ? "bg-accent text-on-accent" : "text-text-muted hover:text-text",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
