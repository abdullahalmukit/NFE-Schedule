export interface SectionHeaderProps {
  title: string;
  /** Right-aligned link, e.g. "Full week". */
  actionLabel?: string;
  onAction?: () => void;
  /** Right-aligned muted text, e.g. "12 classes". */
  meta?: string;
}

export function SectionHeader({ title, actionLabel, onAction, meta }: SectionHeaderProps) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="font-body text-heading font-semibold text-text">{title}</h2>
      {actionLabel ? (
        <button
          type="button"
          onClick={onAction}
          className="font-body text-small font-semibold text-accent hover:underline"
        >
          {actionLabel}
        </button>
      ) : meta ? (
        <span className="font-body text-small text-text-muted">{meta}</span>
      ) : null}
    </div>
  );
}
