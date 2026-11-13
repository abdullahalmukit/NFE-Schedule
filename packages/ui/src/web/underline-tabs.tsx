import { cx } from "./cx";

export interface UnderlineTab<T extends string> {
  value: T;
  label: string;
  /** Count badge (AC-1). */
  count?: number;
}

export interface UnderlineTabsProps<T extends string> {
  tabs: UnderlineTab<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Academics: Exams / Deadlines / Notices. */
export function UnderlineTabs<T extends string>({ tabs, value, onChange }: UnderlineTabsProps<T>) {
  return (
    <div role="tablist" className="flex border-b border-border">
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cx(
              "-mb-px flex h-12 flex-1 items-center justify-center gap-2 border-b-2 font-body text-body font-semibold",
              active
                ? "border-accent text-text"
                : "border-transparent text-text-muted hover:text-text",
            )}
          >
            {t.label}
            {t.count ? (
              <span className="rounded-full bg-surface-raised px-2 text-caption text-text-muted">
                {t.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
