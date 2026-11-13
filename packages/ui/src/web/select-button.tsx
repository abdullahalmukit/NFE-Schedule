import { Icon } from "./icon";

export interface SelectButtonProps {
  /** Current value, e.g. "08:20 – 09:50". */
  value: string;
  label: string;
  onClick?: () => void;
}

/** Dropdown trigger (Empty rooms slot picker); the list opens in a sheet. */
export function SelectButton({ value, label, onClick }: SelectButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-haspopup="listbox"
      onClick={onClick}
      className="flex h-14 w-full items-center justify-between rounded-2xl border border-border bg-surface px-4 font-body text-body font-semibold text-text hover:bg-surface-raised"
    >
      {value}
      <Icon name="chevronDown" size={20} className="text-text-muted" />
    </button>
  );
}
