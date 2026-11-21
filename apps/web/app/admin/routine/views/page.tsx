import Link from "next/link";
import { fill, freeRooms, hasArea, teacherKey, teacherLoads, type MessageKey } from "@nfe/core";
import { Card, cx, Panel } from "@nfe/ui/web";
import { getAdminContext } from "@/lib/admin";
import { loadSlots, loadVersionClasses, versionInEffect } from "@/lib/routine-versions";
import { createClient } from "@/lib/supabase/server";
import { VersionGrid } from "../_components/version-grid";

type Search = { tab?: string; teacher?: string; room?: string; day?: string };
const TABS = ["teachers", "rooms", "free"] as const;

/**
 * A-4 Teacher and room views (ADM-RT-8) of the version in effect in the active
 * semester: a teacher's week and load, a room's week, free rooms per slot.
 */
export default async function RoutineViewsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { access, tr } = await getAdminContext();
  if (!hasArea(access, "routine")) {
    return (
      <Card>
        <p className="font-body text-body text-text-muted">
          {fill(tr("md.noArea"), { area: tr("admin.area.routine") })}
        </p>
      </Card>
    );
  }
  const sp = await searchParams;
  const tab = TABS.includes(sp.tab as (typeof TABS)[number])
    ? (sp.tab as (typeof TABS)[number])
    : "teachers";
  const supabase = await createClient();
  const { data: semester } = await supabase
    .from("semesters")
    .select("id, name")
    .eq("is_active", true)
    .is("deleted_at", null)
    .maybeSingle();
  const version = semester ? await versionInEffect(supabase, semester.id) : null;
  const header = (
    <div>
      <Link href="/admin/routine" className="font-body text-small font-semibold text-accent">
        ← {tr("admin.nav.routine")}
      </Link>
      <h1 className="mt-1 font-display text-display font-bold">{tr("rvw.title")}</h1>
      {version && semester ? (
        <p className="font-body text-small text-text-muted">
          {fill(tr("rvw.version"), { label: version.label, semester: semester.name })}
        </p>
      ) : null}
    </div>
  );
  if (!semester || !version) {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Card>
          <p className="font-body text-body text-text-muted">{tr("rvw.none")}</p>
        </Card>
      </div>
    );
  }

  const [classes, slots, { data: rooms }, { data: home }] = await Promise.all([
    loadVersionClasses(supabase, version.id),
    loadSlots(supabase, semester.id),
    supabase
      .from("rooms")
      .select("id, number, type, buildings(code)")
      .is("deleted_at", null)
      .eq("is_active", true)
      .range(0, 9999),
    supabase.from("departments").select("code").eq("is_home", true).maybeSingle(),
  ]);
  const days = [0, 1, 2, 3, 4, 5, 6].filter((d) => d < 6 || classes.some((c) => c.day === d));
  const roomList = (rooms ?? [])
    .map((r) => ({ id: r.id, building: r.buildings?.code ?? "", number: r.number, type: r.type }))
    .sort(
      (a, b) =>
        a.building.localeCompare(b.building) ||
        a.number.localeCompare(b.number, undefined, { numeric: true }),
    );
  const loads = teacherLoads(classes);
  const chip = (active: boolean) =>
    cx(
      "rounded-lg border px-3 py-1 font-body text-small font-semibold",
      active
        ? "border-accent bg-accent-soft text-accent"
        : "border-border text-text-muted hover:text-text",
    );

  return (
    <div className="flex flex-col gap-6">
      {header}
      <div className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <Link
            key={t}
            href={`?tab=${t}`}
            aria-current={tab === t ? "page" : undefined}
            className={cx(
              "-mb-px border-b-2 px-4 py-2 font-body text-body font-semibold",
              tab === t
                ? "border-accent text-text"
                : "border-transparent text-text-muted hover:text-text",
            )}
          >
            {tr(`rvw.tab.${t}` as MessageKey)}
          </Link>
        ))}
      </div>

      {tab === "teachers" ? (
        <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
          <Panel title={tr("rvw.load")} description={fill(tr("rvw.loadHelp"), { n: loads.length })}>
            <table className="w-full border-collapse font-body text-small">
              <thead>
                <tr className="border-b border-border text-left text-text-muted">
                  <th className="py-2 pr-2 font-semibold">{tr("rti.col.initial")}</th>
                  <th className="py-2 pr-2 text-right font-semibold">{tr("rvw.classes")}</th>
                  <th className="py-2 pr-2 text-right font-semibold">{tr("rvw.labs")}</th>
                  <th className="py-2 text-right font-semibold">{tr("rvw.sections")}</th>
                </tr>
              </thead>
              <tbody>
                {loads.map((t) => (
                  <tr
                    key={t.key}
                    className={cx(
                      "border-b border-border last:border-b-0",
                      t.key === sp.teacher && "bg-surface-raised",
                    )}
                  >
                    <td className="py-1.5 pr-2">
                      <Link
                        href={`?tab=teachers&teacher=${encodeURIComponent(t.key)}`}
                        className="font-semibold text-accent"
                      >
                        {t.department && t.department !== home?.code ? t.key : t.initial}
                      </Link>
                      {t.name ? (
                        <span className="block text-caption text-text-muted">{t.name}</span>
                      ) : null}
                    </td>
                    <td className="py-1.5 pr-2 text-right">{t.classes}</td>
                    <td className="py-1.5 pr-2 text-right">{t.labs}</td>
                    <td className="py-1.5 text-right">{t.sections}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
          <Panel
            title={
              sp.teacher
                ? fill(tr("rvw.teacherWeek"), {
                    t: loads.find((l) => l.key === sp.teacher)?.name ?? sp.teacher,
                  })
                : tr("rvw.pickTeacher")
            }
          >
            {sp.teacher ? (
              <VersionGrid
                classes={classes.filter((c) => teacherKey(c) === sp.teacher)}
                slots={slots}
                days={days}
                home={home?.code ?? null}
                detail="section"
                tr={tr}
              />
            ) : (
              <p className="font-body text-body text-text-muted">{tr("rvw.pickTeacherHelp")}</p>
            )}
          </Panel>
        </div>
      ) : null}

      {tab === "rooms" ? (
        <Panel title={tr("rvw.tab.rooms")}>
          <div className="flex flex-wrap gap-2">
            {roomList.map((r) => (
              <Link key={r.id} href={`?tab=rooms&room=${r.id}`} className={chip(r.id === sp.room)}>
                {r.building}: {r.number}
              </Link>
            ))}
          </div>
          {(() => {
            const room = roomList.find((r) => r.id === sp.room);
            if (!room) {
              return (
                <p className="mt-4 font-body text-body text-text-muted">{tr("rvw.pickRoom")}</p>
              );
            }
            const inRoom = classes.filter(
              (c) =>
                c.building.toUpperCase() === room.building.toUpperCase() &&
                c.room.toUpperCase() === room.number.toUpperCase(),
            );
            return (
              <div className="mt-4">
                <p className="mb-2 font-body text-small text-text-muted">
                  {fill(tr("rvw.roomUse"), { n: inRoom.length, total: days.length * slots.length })}
                </p>
                <VersionGrid
                  classes={inRoom}
                  slots={slots}
                  days={days}
                  home={home?.code ?? null}
                  detail="section"
                  tr={tr}
                />
              </div>
            );
          })()}
        </Panel>
      ) : null}

      {tab === "free" ? (
        <Panel title={tr("rvw.tab.free")} description={tr("rvw.freeHelp")}>
          {(() => {
            const day = days.includes(Number(sp.day)) ? Number(sp.day) : days[0]!;
            const free = freeRooms(
              classes,
              roomList,
              day,
              slots.map((s) => s.position),
            );
            return (
              <>
                <div className="flex flex-wrap gap-2">
                  {days.map((d) => (
                    <Link key={d} href={`?tab=free&day=${d}`} className={chip(d === day)}>
                      {tr(`day.${d}` as MessageKey)}
                    </Link>
                  ))}
                </div>
                <table className="mt-4 w-full border-collapse font-body text-small">
                  <tbody>
                    {slots.map((s) => {
                      const list = free.get(s.position) ?? [];
                      return (
                        <tr
                          key={s.position}
                          className="border-b border-border last:border-b-0 align-top"
                        >
                          <th className="w-32 py-2 pr-3 text-left font-semibold text-text">
                            {s.start}–{s.end}
                            <span className="block font-normal text-caption text-text-muted">
                              {fill(tr("rvw.freeCount"), { n: list.length })}
                            </span>
                          </th>
                          <td className="py-2">
                            <div className="flex flex-wrap gap-1">
                              {list.map((r) => (
                                <span
                                  key={r.id}
                                  className="rounded-md bg-surface-raised px-2 py-0.5 text-caption text-text"
                                >
                                  {r.building}: {r.number}
                                  {r.type === "lab" ? ` · ${tr("course.type.lab")}` : ""}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            );
          })()}
        </Panel>
      ) : null}
    </div>
  );
}
