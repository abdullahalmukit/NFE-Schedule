import type { MessageKey, VersionClass } from "@nfe/core";
import type { AppState } from "@/lib/app-state";
import type { Slot } from "@/lib/routine-versions";

/**
 * One section of a version as a days × time slots table, the same shape as a
 * table of the department's file (A-1 read-only view).
 */
export function VersionGrid({
  classes,
  slots,
  days,
  home,
  tr,
}: {
  classes: VersionClass[];
  slots: Slot[];
  /** Day indexes to show as rows (0 = Saturday). */
  days: number[];
  /** Home department code; other departments are shown as INITIAL(DEPT). */
  home: string | null;
  tr: AppState["tr"];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse font-body text-small">
        <thead>
          <tr>
            <th className="w-24 border border-border bg-surface-raised p-2 text-left text-text-muted" />
            {slots.map((s) => (
              <th
                key={s.position}
                className="border border-border bg-surface-raised p-2 text-center font-semibold text-text-muted"
              >
                {s.start}–{s.end}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d}>
              <th className="border border-border p-2 text-left align-top font-semibold text-text">
                {tr(`day.${d}` as MessageKey)}
              </th>
              {slots.map((s) => {
                const here = classes.filter((c) => c.day === d && c.slot === s.position);
                return (
                  <td key={s.position} className="border border-border p-1 align-top">
                    <div className="flex flex-col gap-1">
                      {here.map((c) => (
                        <div
                          key={c.id}
                          className="rounded-lg bg-surface-raised p-2"
                          title={c.courseTitle ?? undefined}
                        >
                          <p className="font-semibold text-text">
                            {c.courseCode}-{c.labGroup ?? c.sectionLabel}
                          </p>
                          {c.courseTitle ? (
                            <p className="truncate text-caption text-text-muted">{c.courseTitle}</p>
                          ) : null}
                          <p className="text-caption text-text" title={c.facultyName ?? undefined}>
                            {c.facultyDept && c.facultyDept !== home
                              ? `${c.facultyInitial}(${c.facultyDept})`
                              : c.facultyInitial}{" "}
                            · {c.building}: {c.room}
                          </p>
                        </div>
                      ))}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
