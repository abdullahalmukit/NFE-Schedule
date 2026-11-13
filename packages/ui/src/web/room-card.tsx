import { Pill } from "./pill";

export interface RoomCardProps {
  building: string;
  number: string;
  /** "Lab" */
  badge?: string;
  onClick?: () => void;
}

export function RoomCard({ building, number, badge, onClick }: RoomCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-22 w-full flex-col items-start rounded-card bg-surface p-4 text-left shadow-card hover:bg-surface-raised"
    >
      <span className="font-body text-small text-text-muted">{building}</span>
      <span className="font-display text-title font-bold text-text">{number}</span>
      {badge ? (
        <span className="mt-1">
          <Pill label={badge} tone="info" size="sm" />
        </span>
      ) : null}
    </button>
  );
}
