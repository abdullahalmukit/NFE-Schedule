export interface NextClassCardProps {
  /** "NEXT CLASS · TOMORROW" */
  caption: string;
  title: string;
  /** "0531-1103 · Theory" */
  subtitle: string;
  /** "08:20 – 09:50" */
  time: string;
  initial: string;
  room: string;
  onClick?: () => void;
}

export function NextClassCard({
  caption,
  title,
  subtitle,
  time,
  initial,
  room,
  onClick,
}: NextClassCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-card bg-accent p-5 text-left text-on-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <p className="font-body text-caption font-semibold uppercase tracking-[0.06em] opacity-80">
        {caption}
      </p>
      <p className="mt-2 font-display text-title font-bold">{title}</p>
      <p className="font-body text-small opacity-80">{subtitle}</p>
      <p className="mt-4 flex flex-wrap gap-x-6 gap-y-1 font-body text-body font-bold">
        <span>{time}</span>
        <span>{initial}</span>
        <span>{room}</span>
      </p>
    </button>
  );
}
