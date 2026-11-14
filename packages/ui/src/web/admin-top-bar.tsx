import type { ReactNode } from "react";
import { cx } from "./cx";
import { Icon } from "./icon";
import { Logo } from "./logo";

export interface AdminNavLink {
  href: string;
  label: string;
  active?: boolean;
}

export interface AdminTopBarProps {
  /** "NFE Schedule" */
  appName: string;
  /** "Admin", shown in accent. */
  areaLabel: string;
  /** Where the name links to (the dashboard). */
  homeHref?: string;
  links: AdminNavLink[];
  /** Links under "More ▾" (Calendar, Users, … Audit log). */
  moreLinks?: AdminNavLink[];
  moreLabel?: string;
  /** Signed-in name at the right. */
  user: string;
  /** Extra controls at the right, e.g. a sign-out button. */
  actions?: ReactNode;
  navLabel?: string;
}

function linkClass(active: boolean | undefined) {
  return cx(
    "whitespace-nowrap rounded-xl px-3 py-2 font-body text-small font-semibold",
    active ? "bg-surface text-text" : "text-text-muted hover:text-text",
  );
}

/** Admin header: app name, area links (only those the admin may use), More menu, user. */
export function AdminTopBar({
  appName,
  areaLabel,
  homeHref = "/admin",
  links,
  moreLinks = [],
  moreLabel = "More",
  user,
  actions,
  navLabel,
}: AdminTopBarProps) {
  const moreActive = moreLinks.some((l) => l.active);
  return (
    <header className="flex h-16 items-center gap-6 border-b border-border bg-bg px-6">
      <a href={homeHref} className="flex shrink-0 items-center gap-3">
        <Logo size={32} />
        <span className="font-display text-heading font-bold text-text">
          {appName} <span className="text-accent">{areaLabel}</span>
        </span>
      </a>
      <nav aria-label={navLabel} className="flex min-w-0 flex-1 items-center gap-1">
        <div className="flex min-w-0 gap-1 overflow-x-auto">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              aria-current={l.active ? "page" : undefined}
              className={linkClass(l.active)}
            >
              {l.label}
            </a>
          ))}
        </div>
        {moreLinks.length ? (
          <details className="group relative">
            <summary
              className={cx(
                linkClass(moreActive),
                "flex cursor-pointer list-none items-center gap-1 [&::-webkit-details-marker]:hidden",
              )}
            >
              {moreLabel}
              <Icon
                name="chevronDown"
                size={16}
                className="transition-transform group-open:rotate-180"
              />
            </summary>
            <div className="absolute left-0 z-20 mt-2 flex min-w-48 flex-col gap-1 rounded-card border border-border bg-surface p-2 shadow-card">
              {moreLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  aria-current={l.active ? "page" : undefined}
                  className={linkClass(l.active)}
                >
                  {l.label}
                </a>
              ))}
            </div>
          </details>
        ) : null}
      </nav>
      <span className="shrink-0 font-body text-small text-text-muted">{user}</span>
      {actions}
    </header>
  );
}
