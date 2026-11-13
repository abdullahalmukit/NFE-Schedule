import { Icon } from "./icon";

export interface SettingsRowProps {
  title: string;
  subtitle?: string;
  onClick?: () => void;
}

export function SettingsRow({ title, subtitle, onClick }: SettingsRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-14 w-full items-center gap-3 border-b border-border px-4 py-3 text-left last:border-b-0 hover:bg-surface-raised"
    >
      <span className="min-w-0 flex-1">
        <span className="block font-body text-body font-semibold text-text">{title}</span>
        {subtitle ? (
          <span className="block font-body text-small text-text-muted">{subtitle}</span>
        ) : null}
      </span>
      <Icon name="chevronRight" size={20} className="shrink-0 text-text-muted" />
    </button>
  );
}
