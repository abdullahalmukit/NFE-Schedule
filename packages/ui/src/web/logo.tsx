import type { CSSProperties } from "react";
import { cx } from "./cx";

export interface LogoProps {
  size?: number;
  /** Accessible name; leave out when a visible app name sits next to the logo. */
  label?: string;
  className?: string;
}

/**
 * The single app logo. It shows `--nfe-logo-image` (theme.css: the built-in
 * logo); set it with `logoOverrideStyle` when the admin uploads a logo.
 */
export function Logo({ size = 40, label, className }: LogoProps) {
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cx("inline-block shrink-0 bg-contain bg-center bg-no-repeat", className)}
      style={{ width: size, height: size, backgroundImage: "var(--nfe-logo-image)" }}
    />
  );
}

/** Style for <html> that swaps the logo everywhere (admin `branding.logo_path`). */
export function logoOverrideStyle(url: string | null | undefined): CSSProperties | undefined {
  if (!url) return undefined;
  return { ["--nfe-logo-image" as string]: `url(${JSON.stringify(url)})` } as CSSProperties;
}
