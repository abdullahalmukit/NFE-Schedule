import { cx } from "./cx";
import { Icon } from "./icon";
import { courseVars } from "./tone";

export interface ClassCardProps {
  start: string;
  end: string;
  title: string;
  /** "0531-1104 · Lab" */
  meta: string;
  teacher: string;
  room: string;
  /** Lab group badge, e.g. "A1". */
  badge?: string;
  colorIndex: number;
  /** Exception text shown on the card, e.g. "Cancelled". */
  status?: string;
  cancelled?: boolean;
  teacherLabel?: string;
  roomLabel?: string;
  onClick?: () => void;
  onTeacher?: () => void;
  onRoom?: () => void;
}

/** Routine daily card with the time rail on the left. */
export function ClassCard(props: ClassCardProps) {
  const c = courseVars(props.colorIndex);
  return (
    <div className="flex gap-3">
      <div className="flex w-14 shrink-0 flex-col justify-between py-1 font-body text-small font-semibold text-text-muted">
        <span>{props.start}</span>
        <span>{props.end}</span>
      </div>
      <div
        className="relative min-w-0 flex-1 rounded-card p-4"
        style={{ background: c.fill, color: c.onFill }}
      >
        <button type="button" onClick={props.onClick} className="block w-full pr-10 text-left">
          <span
            className={cx(
              "block font-display text-heading font-bold",
              props.cancelled && "line-through",
            )}
          >
            {props.title}
          </span>
          <span className="block font-body text-small opacity-80">{props.meta}</span>
        </button>
        {props.badge ? (
          <span className="absolute right-4 top-4 rounded-md bg-text px-2 py-0.5 font-body text-caption font-bold text-bg">
            {props.badge}
          </span>
        ) : null}
        {props.status ? (
          <p className="mt-2 font-body text-small font-semibold">{props.status}</p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            aria-label={props.teacherLabel}
            onClick={props.onTeacher}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-black/20 px-3 font-body text-small font-semibold"
          >
            <Icon name="user" size={14} />
            {props.teacher}
          </button>
          <button
            type="button"
            aria-label={props.roomLabel}
            onClick={props.onRoom}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-black/20 px-3 font-body text-small font-semibold"
          >
            <Icon name="pin" size={14} />
            {props.room}
          </button>
        </div>
      </div>
    </div>
  );
}
