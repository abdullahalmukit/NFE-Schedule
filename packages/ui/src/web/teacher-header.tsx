import { Avatar } from "./avatar";
import { Button } from "./button";

export interface TeacherHeaderProps {
  initial: string;
  name: string;
  designation: string;
  department: string;
  imageUrl?: string;
  callLabel?: string;
  emailLabel?: string;
  onCall?: () => void;
  onEmail?: () => void;
}

export function TeacherHeader(p: TeacherHeaderProps) {
  return (
    <div>
      <div className="flex items-center gap-4">
        <Avatar initial={p.initial} imageUrl={p.imageUrl} size={80} />
        <div className="min-w-0">
          <p className="font-display text-title font-bold text-text">{p.name}</p>
          <p className="font-body text-small text-text-muted">{p.designation}</p>
          <p className="font-body text-small text-text-muted">{p.department}</p>
        </div>
      </div>
      {p.callLabel || p.emailLabel ? (
        <div className="mt-4 flex gap-3">
          {p.callLabel ? (
            <Button
              label={p.callLabel}
              icon="phone"
              size="medium"
              onClick={p.onCall}
              className="flex-1"
            />
          ) : null}
          {p.emailLabel ? (
            <Button
              label={p.emailLabel}
              icon="mail"
              variant="secondary"
              size="medium"
              onClick={p.onEmail}
              className="flex-1"
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
