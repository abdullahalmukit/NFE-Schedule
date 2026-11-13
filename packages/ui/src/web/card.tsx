import type { ReactNode } from "react";
import { cx } from "./cx";

export interface CardProps {
  children: ReactNode;
  /** `outlined`: border instead of fill (free time, banners). */
  variant?: "filled" | "outlined";
  padding?: "none" | "md" | "lg";
  className?: string;
}

export function Card({ children, variant = "filled", padding = "lg", className }: CardProps) {
  return (
    <div
      className={cx(
        "rounded-card",
        variant === "filled" ? "bg-surface shadow-card" : "border border-border",
        padding === "lg" && "p-4",
        padding === "md" && "p-3",
        className,
      )}
    >
      {children}
    </div>
  );
}
