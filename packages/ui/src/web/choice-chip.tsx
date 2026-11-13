import { cx } from "./cx";

export interface ChoiceChipProps {
  label: string;
  selected?: boolean;
  /** Lab groups use wide chips that share the row. */
  wide?: boolean;
  /** Day chips on Empty rooms are fully rounded. */
  shape?: "chip" | "pill";
  onClick?: () => void;
}

export function ChoiceChip({ label, selected, wide, shape = "chip", onClick }: ChoiceChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={cx(
        "h-12 min-w-14 px-4 font-body text-body font-semibold transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        shape === "pill" ? "rounded-full" : "rounded-chip",
        wide && "flex-1",
        selected
          ? "bg-accent text-on-accent"
          : "border border-border bg-surface text-text hover:bg-surface-raised",
      )}
    >
      {label}
    </button>
  );
}
