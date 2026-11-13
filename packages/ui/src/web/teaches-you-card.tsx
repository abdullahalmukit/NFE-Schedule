export interface TeachesYouCardProps {
  /** "TEACHES YOU" */
  caption: string;
  /** "0531-1104 · Lab group A1" */
  title: string;
  /** "Wednesday 08:20 – 09:50 · AB-1: 206" */
  detail: string;
}

export function TeachesYouCard({ caption, title, detail }: TeachesYouCardProps) {
  return (
    <div className="rounded-card border border-accent bg-surface p-4">
      <p className="font-body text-caption font-semibold uppercase tracking-[0.06em] text-accent">
        {caption}
      </p>
      <p className="mt-1 font-body text-body font-semibold text-text">{title}</p>
      <p className="font-body text-small text-text-muted">{detail}</p>
    </div>
  );
}
