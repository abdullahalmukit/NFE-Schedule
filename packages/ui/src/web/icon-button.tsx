import type { IconName } from "../icon-names";
import { cx } from "./cx";
import { Icon } from "./icon";

export interface IconButtonProps {
  icon: IconName;
  /** Screen-reader label (NF-6). */
  label: string;
  /** Small amber dot, e.g. unread notifications. */
  dot?: boolean;
  onClick?: () => void;
  className?: string;
}

export function IconButton({ icon, label, dot, onClick, className }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cx(
        "relative inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface text-text",
        "hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-accent",
        className,
      )}
    >
      <Icon name={icon} size={20} />
      {dot ? (
        <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-warning ring-2 ring-surface" />
      ) : null}
    </button>
  );
}
