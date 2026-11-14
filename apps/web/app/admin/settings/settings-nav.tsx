"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@nfe/ui/web";

export function SettingsNav({ items }: { items: { href: string; label: string }[] }) {
  const path = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {items.map((i) => {
        const active = path === i.href;
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "rounded-xl px-3 py-2 font-body text-small font-semibold",
              active ? "bg-surface text-text" : "text-text-muted hover:bg-surface hover:text-text",
            )}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
