import type { IconName } from "../icon-names";
import { cx } from "./cx";
import { Icon } from "./icon";

export interface TextFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Accessible name when there is no visible label. */
  label: string;
  icon?: IconName;
  /** `pill`: search field; `box`: admin table inputs. */
  shape?: "pill" | "box";
  type?: "text" | "search" | "email" | "tel" | "number";
}

export function TextField({
  value,
  onChange,
  placeholder,
  label,
  icon,
  shape = "box",
  type = "text",
}: TextFieldProps) {
  return (
    <label
      className={cx(
        "flex items-center gap-3 border border-border bg-surface px-4 text-text focus-within:border-accent",
        shape === "pill" ? "h-14 rounded-full" : "h-11 rounded-xl",
      )}
    >
      {icon ? <Icon name={icon} size={20} className="shrink-0 text-text-muted" /> : null}
      <span className="sr-only">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-full min-w-0 flex-1 bg-transparent font-body text-body outline-none placeholder:text-text-faint"
      />
    </label>
  );
}
