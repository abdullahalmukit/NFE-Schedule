import type { IconName } from "../icon-names";
import { cx } from "./cx";
import { Icon } from "./icon";

export interface InfoBannerProps {
  icon: IconName;
  /** Amber for attention, accent for refresh / version. */
  tone?: "warning" | "accent";
  title: string;
  body?: string;
  /** Outlined (version banner) or filled (onboarding note). */
  variant?: "filled" | "outlined";
  onClick?: () => void;
}

export function InfoBanner({
  icon,
  tone = "accent",
  title,
  body,
  variant = "filled",
  onClick,
}: InfoBannerProps) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={cx(
        "flex w-full items-start gap-3 rounded-card p-4 text-left",
        variant === "filled" ? "bg-surface shadow-card" : "border border-border",
      )}
    >
      <Icon
        name={icon}
        size={22}
        className={cx("mt-0.5 shrink-0", tone === "warning" ? "text-warning" : "text-accent")}
      />
      <span>
        <span className="block font-body text-body font-semibold text-text">{title}</span>
        {body ? <span className="block font-body text-small text-text-muted">{body}</span> : null}
      </span>
    </Tag>
  );
}
