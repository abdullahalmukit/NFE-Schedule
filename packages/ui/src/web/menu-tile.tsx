import type { IconName } from "../icon-names";
import type { Tone } from "../theme";
import { cx } from "./cx";
import { Icon } from "./icon";
import { toneClass } from "./tone";

export interface MenuTileProps {
  icon: IconName;
  label: string;
  /** Tinted icon square: amber, green, purple, blue in the mockup. */
  tone: Tone;
  onClick?: () => void;
}

export function MenuTile({ icon, label, tone, onClick }: MenuTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-26 w-full flex-col items-start justify-between gap-4 rounded-card bg-surface p-4 text-left shadow-card hover:bg-surface-raised"
    >
      <span
        className={cx("flex h-10 w-10 items-center justify-center rounded-xl", toneClass[tone])}
      >
        <Icon name={icon} size={20} />
      </span>
      <span className="font-body text-body font-semibold text-text">{label}</span>
    </button>
  );
}
