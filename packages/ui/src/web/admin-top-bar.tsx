import { cx } from "./cx";
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
  links: AdminNavLink[];
  /** Signed-in name at the right. */
  user: string;
  navLabel?: string;
}

/** Admin header: app name, area links (only those the admin may use), user. */
export function AdminTopBar({ appName, areaLabel, links, user, navLabel }: AdminTopBarProps) {
  return (
    <header className="flex h-16 items-center gap-8 border-b border-border bg-bg px-6">
      <span className="flex shrink-0 items-center gap-3">
        <Logo size={32} />
        <span className="font-display text-heading font-bold text-text">
          {appName} <span className="text-accent">{areaLabel}</span>
        </span>
      </span>
      <nav aria-label={navLabel} className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
        {links.map((l) => (
          <a
            key={l.href}
            href={l.href}
            aria-current={l.active ? "page" : undefined}
            className={cx(
              "whitespace-nowrap rounded-xl px-3 py-2 font-body text-small font-semibold",
              l.active ? "bg-surface text-text" : "text-text-muted hover:text-text",
            )}
          >
            {l.label}
          </a>
        ))}
      </nav>
      <span className="shrink-0 font-body text-small text-text-muted">{user}</span>
    </header>
  );
}
