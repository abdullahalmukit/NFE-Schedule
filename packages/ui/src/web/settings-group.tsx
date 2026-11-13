import type { ReactNode } from "react";

export interface SettingsGroupProps {
  /** Caption above the group, e.g. "MY SCHEDULE". */
  title?: string;
  children: ReactNode;
}

/** Grouped list of SettingsRow. */
export function SettingsGroup({ title, children }: SettingsGroupProps) {
  return (
    <section>
      {title ? (
        <h3 className="mb-2 font-body text-caption font-semibold uppercase tracking-[0.06em] text-text-muted">
          {title}
        </h3>
      ) : null}
      <div className="overflow-hidden rounded-card bg-surface shadow-card">{children}</div>
    </section>
  );
}
