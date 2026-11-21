import { changesBySection, fill, type VersionClass } from "@nfe/core";
import type { Change } from "@nfe/parser";
import { Pill } from "@nfe/ui/web";
import type { AppState } from "@/lib/app-state";
import { describeChange, type Slot } from "@/lib/routine-versions";

const TONE = { added: "accent", removed: "danger", moved: "info", changed: "warning" } as const;

/** ADM-RT-3: changes grouped by section, in plain words. */
export function ChangeList({
  changes,
  slots,
  tr,
}: {
  changes: Change<VersionClass>[];
  slots: Slot[];
  tr: AppState["tr"];
}) {
  const groups = changesBySection(changes);
  if (!groups.length) {
    return <p className="font-body text-body text-text-muted">{tr("rtp.noChanges")}</p>;
  }
  return (
    <div className="flex flex-col gap-2">
      {groups.map((g) => (
        <details
          key={g.section}
          className="rounded-xl border border-border p-3"
          open={groups.length <= 6}
        >
          <summary className="cursor-pointer font-body text-body font-semibold text-text">
            {g.section}{" "}
            <span className="font-normal text-text-muted">
              · {fill(tr("rtp.changeCount"), { n: g.changes.length })}
            </span>
          </summary>
          <ul className="mt-2 flex flex-col gap-1">
            {g.changes.map((c, i) => (
              <li key={i} className="flex items-start gap-2 font-body text-small text-text">
                <Pill size="sm" tone={TONE[c.kind]} label={tr(`rtp.kind.${c.kind}`)} />
                <span>{describeChange(tr, slots, c as Change<VersionClass>)}</span>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}
