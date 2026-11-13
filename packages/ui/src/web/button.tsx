import type { IconName } from "../icon-names";
import { cx } from "./cx";
import { Icon } from "./icon";

export interface ButtonProps {
  label: string;
  variant?: "primary" | "secondary";
  icon?: IconName;
  /** Primary buttons are full width and 56 px tall (DESIGN_SYSTEM §5). */
  size?: "large" | "medium";
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit";
}

export function Button({
  label,
  variant = "primary",
  icon,
  size = "large",
  disabled,
  onClick,
  className,
  type = "button",
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-button px-5 font-body font-semibold transition-opacity",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:cursor-not-allowed disabled:opacity-50",
        size === "large" ? "h-14 w-full text-body" : "h-11 text-small",
        variant === "primary"
          ? "bg-accent text-on-accent hover:opacity-90"
          : "border border-border bg-surface text-text hover:bg-surface-raised",
        className,
      )}
    >
      {icon ? <Icon name={icon} size={18} /> : null}
      {label}
    </button>
  );
}
