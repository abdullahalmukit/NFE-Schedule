import { LOGO_LEAF_PATH, LOGO_SQUARES, LOGO_VIEWBOX, logoColors, type LogoVariant } from "../logo";
import { cx } from "./cx";

export interface LogoMarkProps {
  size?: number;
  variant?: LogoVariant;
  className?: string;
}

export function LogoMark({ size = 32, variant = "default", className }: LogoMarkProps) {
  const c = logoColors(variant);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${LOGO_VIEWBOX} ${LOGO_VIEWBOX}`}
      className={className}
      aria-hidden="true"
    >
      {LOGO_SQUARES.map((s) => (
        <rect
          key={`${s.x}-${s.y}`}
          x={s.x}
          y={s.y}
          width={s.size}
          height={s.size}
          rx={s.r}
          fill={c.squares}
        />
      ))}
      <path d={LOGO_LEAF_PATH} fill={c.leaf} />
    </svg>
  );
}

export interface LogoProps {
  /** Usually "NFE"; shown bold. */
  strong: string;
  /** Usually "Schedule"; shown regular. */
  rest: string;
  tagline?: string;
  variant?: LogoVariant;
  size?: number;
  className?: string;
}

/** Horizontal lockup: mark + "NFE Schedule" wordmark (+ optional tagline). */
export function Logo({
  strong,
  rest,
  tagline,
  variant = "default",
  size = 40,
  className,
}: LogoProps) {
  return (
    <div className={cx("flex items-center gap-3", className)}>
      <LogoMark size={size} variant={variant} />
      <div className="flex flex-col">
        <span
          className={cx(
            "font-display leading-none",
            variant === "reversed" ? "text-ground" : "text-text",
          )}
          style={{ fontSize: size * 0.6 }}
        >
          <span className="font-bold">{strong}</span> {rest}
        </span>
        {tagline ? (
          <span className="mt-1 font-body text-small text-text-muted">{tagline}</span>
        ) : null}
      </div>
    </div>
  );
}
