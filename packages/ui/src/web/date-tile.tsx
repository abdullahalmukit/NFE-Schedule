export interface DateTileProps {
  /** "MON" */
  month: string;
  /** "16" */
  day: string;
}

export function DateTile({ month, day }: DateTileProps) {
  return (
    <span className="flex h-16 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-surface-raised">
      <span className="font-body text-caption font-semibold uppercase text-text-muted">
        {month}
      </span>
      <span className="font-display text-title font-bold leading-none text-text">{day}</span>
    </span>
  );
}
