import { cx } from "./cx";
import { Icon } from "./icon";

export interface AvatarProps {
  /** Teacher initial ("DAMR"); without it a person icon is shown. */
  initial?: string;
  imageUrl?: string;
  size?: number;
  label?: string;
}

export function Avatar({ initial, imageUrl, size = 48, label }: AvatarProps) {
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      className={cx(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        initial ? "bg-accent-soft text-accent" : "bg-surface-raised text-text-muted",
      )}
      style={{ width: size, height: size }}
    >
      {imageUrl ? (
        <img src={imageUrl} alt="" className="h-full w-full object-cover" />
      ) : initial ? (
        <span className="font-display font-bold" style={{ fontSize: size * 0.28 }}>
          {initial}
        </span>
      ) : (
        <Icon name="user" size={size * 0.45} />
      )}
    </span>
  );
}
