import type { ReactNode } from "react";

export interface PanelProps {
  title: string;
  description?: string;
  /** Right side of the header, e.g. an "80 to complete" pill. */
  aside?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

/** Admin card with a heading ("Faculty initials without details", "Checks"). */
export function Panel({ title, description, aside, children, footer }: PanelProps) {
  return (
    <section className="rounded-card bg-surface p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-heading font-bold text-text">{title}</h2>
          {description ? (
            <p className="mt-1 font-body text-small text-text-muted">{description}</p>
          ) : null}
        </div>
        {aside}
      </div>
      <div className="mt-4">{children}</div>
      {footer ? <div className="mt-4">{footer}</div> : null}
    </section>
  );
}
