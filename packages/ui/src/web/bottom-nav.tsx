import type { IconName } from "../icon-names";
import { cx } from "./cx";
import { Icon } from "./icon";

export interface BottomNavItem<T extends string> {
  value: T;
  label: string;
  icon: IconName;
}

export interface BottomNavProps<T extends string> {
  items: BottomNavItem<T>[];
  value: T;
  onChange: (value: T) => void;
  label?: string;
}

/** Five tabs, icon + label, active in accent. Tabs come from `nav.tabs`. */
export function BottomNav<T extends string>({ items, value, onChange, label }: BottomNavProps<T>) {
  return (
    <nav aria-label={label} className="flex h-18 border-t border-border bg-surface">
      {items.map((it) => {
        const active = it.value === value;
        return (
          <button
            key={it.value}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => onChange(it.value)}
            className={cx(
              "flex flex-1 flex-col items-center justify-center gap-1 font-body text-caption font-semibold",
              active ? "text-accent" : "text-text-muted hover:text-text",
            )}
          >
            <Icon name={it.icon} size={22} />
            {it.label}
          </button>
        );
      })}
    </nav>
  );
}
