import { courseVars } from "./tone";

export interface ClassRowProps {
  /** "08:20" */
  time: string;
  title: string;
  /** "0531-1103 · DNU · AB-1: 304" */
  meta: string;
  /** Course colour index (hash of the course code). */
  colorIndex: number;
  onClick?: () => void;
}

/** Home list row: coloured time tile + title + meta. */
export function ClassRow({ time, title, meta, colorIndex, onClick }: ClassRowProps) {
  const c = courseVars(colorIndex);
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-accent"
    >
      <span
        className="flex h-12 w-14 shrink-0 items-center justify-center rounded-xl font-body text-small font-bold"
        style={{ background: c.tint, color: c.onTint }}
      >
        {time}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-body text-body font-semibold text-text">{title}</span>
        <span className="block truncate font-body text-small text-text-muted">{meta}</span>
      </span>
    </button>
  );
}
