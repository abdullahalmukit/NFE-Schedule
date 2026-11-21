import Link from "next/link";
import type { ReactNode } from "react";
import { dayIndexOfDate, EXCEPTION_TYPES, fill, hasArea, type MessageKey } from "@nfe/core";
import { Card, Panel, Pill } from "@nfe/ui/web";
import { formatDate, getAdminContext } from "@/lib/admin";
import { loadSlots, loadVersionClasses, versionInEffect } from "@/lib/routine-versions";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "../../_components/action-form";
import { Hidden, inputClass, SelectField, TextField } from "../../_components/fields";
import { createException, withdrawException } from "../exception-actions";

type Search = { section?: string; date?: string; past?: string };
const TONE = {
  cancelled: "danger",
  rescheduled: "info",
  room_change: "warning",
  makeup: "accent",
} as const;

/**
 * A-5 Class exceptions (ADM-RT-9): a dated list of one-off changes and a form
 * to add one for any section — pick the section and date, then the class.
 */
export default async function ExceptionsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { access, tr, locale } = await getAdminContext();
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
  const today = new Date().toISOString().slice(0, 10);
  const supabase = await createClient();
  const { data: semester } = await supabase
    .from("semesters")
    .select("id, name")
    .eq("is_active", true)
    .is("deleted_at", null)
    .maybeSingle();

  let list = supabase
    .from("class_exceptions")
    .select(
      "id, date, type, note, new_date, section_id, sections(name, batches(code)), lab_groups(name), class_slots(courses(code), time_slots(start_time)), courses(code), new_time_slot:time_slots!class_exceptions_new_time_slot_id_fkey(start_time), rooms(number, buildings(code))",
    )
    .is("deleted_at", null)
    .order("date")
    .limit(200);
  list =
    sp.past === "1"
      ? list.lt("date", today).order("date", { ascending: false })
      : list.gte("date", today);

  const [{ data: exceptions }, { data: sections }] = await Promise.all([
    list,
    supabase
      .from("sections")
      .select("id, name, batches(code, status)")
      .is("deleted_at", null)
      .range(0, 9999),
  ]);
  const sectionOptions = (sections ?? [])
    .filter((s) => s.batches && s.batches.status === "active")
    .map((s) => ({ value: s.id, label: `${s.batches!.code}-${s.name}` }))
    .sort((a, b) => b.label.localeCompare(a.label, undefined, { numeric: true }));

  // Step 2: the classes of the chosen section on the weekday of the chosen date.
  const picked =
    semester &&
    sp.section &&
    sectionOptions.some((s) => s.value === sp.section) &&
    sp.date &&
    sp.date >= today
      ? { section: sp.section, date: sp.date }
      : null;
  let step2: ReactNode = null;
  if (picked && semester) {
    const version = await versionInEffect(supabase, semester.id, picked.date);
    const [
      classes,
      slots,
      { data: courses },
      { data: faculty },
      { data: rooms },
      { data: groups },
    ] = await Promise.all([
      version ? loadVersionClasses(supabase, version.id) : Promise.resolve([]),
      loadSlots(supabase, semester.id),
      supabase
        .from("courses")
        .select("id, code, title")
        .is("deleted_at", null)
        .neq("status", "archived")
        .order("code"),
      supabase
        .from("faculty_public")
        .select("id, initial, full_name")
        .is("deleted_at", null)
        .neq("status", "left")
        .order("initial"),
      supabase
        .from("rooms")
        .select("id, number, buildings(code)")
        .is("deleted_at", null)
        .eq("is_active", true)
        .range(0, 9999),
      supabase
        .from("lab_groups")
        .select("id, name")
        .eq("section_id", picked.section)
        .is("deleted_at", null)
        .order("name"),
    ]);
    const weekday = dayIndexOfDate(picked.date);
    const onDay = classes
      .filter((c) => c.sectionId === picked.section && c.day === weekday)
      .sort((a, b) => a.slot - b.slot);
    const slotLabel = (pos: number) => {
      const s = slots.find((x) => x.position === pos);
      return s ? `${s.start}–${s.end}` : "";
    };
    const roomOptions = (rooms ?? [])
      .map((r) => ({ value: r.id, label: `${r.buildings?.code ?? ""}: ${r.number}` }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
    step2 = (
      <ActionForm action={createException} submitLabel={tr("rex.save")} resetOnSuccess>
        <Hidden name="section_id" value={picked.section} />
        <Hidden name="date" value={picked.date} />
        <p className="font-body text-small text-text">
          {fill(tr("rex.for"), {
            section: sectionOptions.find((s) => s.value === picked.section)?.label ?? "",
            date: formatDate(picked.date, locale),
            day: tr(`day.${weekday}` as MessageKey),
          })}
        </p>
        <SelectField
          name="type"
          label={tr("rex.type")}
          defaultValue="cancelled"
          options={EXCEPTION_TYPES.map((t) => ({
            value: t,
            label: tr(`rex.type.${t}` as MessageKey),
          }))}
        />
        <SelectField
          name="class_slot_id"
          label={tr("rex.class")}
          options={[
            { value: "", label: onDay.length ? tr("rex.classPick") : tr("rex.noClass") },
            ...onDay.map((c) => ({
              value: c.id,
              label: `${slotLabel(c.slot)} · ${c.courseCode}-${c.labGroup ?? c.sectionLabel} · ${c.facultyInitial} · ${c.building}: ${c.room}`,
            })),
          ]}
        />
        <fieldset className="flex flex-col gap-3 rounded-xl border border-border p-3">
          <legend className="px-1 font-body text-caption font-semibold text-text-muted">
            {tr("rex.newPlace")}
          </legend>
          <div className="grid grid-cols-2 gap-3">
            <TextField name="new_date" label={tr("rex.newDate")} type="date" />
            <SelectField
              name="new_time_slot_id"
              label={tr("rex.newTime")}
              options={[
                { value: "", label: "—" },
                ...slots.map((s) => ({ value: s.id, label: `${s.start}–${s.end}` })),
              ]}
            />
          </div>
          <SelectField
            name="new_room_id"
            label={tr("rex.newRoom")}
            options={[{ value: "", label: "—" }, ...roomOptions]}
          />
          <p className="font-body text-caption text-text-faint">{tr("rex.newPlaceHelp")}</p>
        </fieldset>
        <fieldset className="flex flex-col gap-3 rounded-xl border border-border p-3">
          <legend className="px-1 font-body text-caption font-semibold text-text-muted">
            {tr("rex.makeup")}
          </legend>
          <SelectField
            name="course_id"
            label={tr("rte.course")}
            options={[
              { value: "", label: "—" },
              ...(courses ?? []).map((c) => ({
                value: c.id,
                label: c.title ? `${c.code} · ${c.title}` : c.code,
              })),
            ]}
          />
          <div className="grid grid-cols-2 gap-3">
            <SelectField
              name="lab_group_id"
              label={tr("rte.labGroup")}
              options={[
                { value: "", label: tr("rte.wholeSection") },
                ...(groups ?? []).map((g) => ({ value: g.id, label: g.name })),
              ]}
            />
            <SelectField
              name="faculty_id"
              label={tr("rte.teacher")}
              options={[
                { value: "", label: "—" },
                ...(faculty ?? []).map((f) => ({
                  value: f.id ?? "",
                  label: f.full_name ? `${f.initial} · ${f.full_name}` : (f.initial ?? ""),
                })),
              ]}
            />
          </div>
          <p className="font-body text-caption text-text-faint">{tr("rex.makeupHelp")}</p>
        </fieldset>
        <TextField name="note" label={tr("rex.note")} placeholder={tr("rex.notePlaceholder")} />
      </ActionForm>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/routine" className="font-body text-small font-semibold text-accent">
          ← {tr("admin.nav.routine")}
        </Link>
        <h1 className="mt-1 font-display text-display font-bold">{tr("rex.title")}</h1>
        <p className="font-body text-small text-text-muted">{tr("rex.help")}</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Panel
          title={tr(sp.past === "1" ? "rex.past" : "rex.upcoming")}
          aside={
            <Link
              href={sp.past === "1" ? "?" : "?past=1"}
              className="font-body text-small font-semibold text-accent"
            >
              {tr(sp.past === "1" ? "rex.upcoming" : "rex.past")}
            </Link>
          }
        >
          {exceptions?.length ? (
            <ul className="flex flex-col">
              {exceptions.map((e) => {
                const course = e.class_slots?.courses?.code ?? e.courses?.code ?? "";
                const time = (
                  e.class_slots?.time_slots?.start_time ??
                  e.new_time_slot?.start_time ??
                  ""
                ).slice(0, 5);
                const section = `${e.sections?.batches?.code ?? ""}-${e.sections?.name ?? ""}${e.lab_groups ? ` / ${e.lab_groups.name}` : ""}`;
                return (
                  <li
                    key={e.id}
                    className="flex flex-wrap items-start gap-3 border-b border-border py-3 last:border-b-0"
                  >
                    <div className="w-28 shrink-0 font-body text-small font-semibold text-text">
                      {formatDate(e.date, locale)}
                      <span className="block font-normal text-caption text-text-muted">
                        {tr(`day.${dayIndexOfDate(e.date)}` as MessageKey)} {time}
                      </span>
                    </div>
                    <div className="grow font-body text-small text-text">
                      <Pill
                        size="sm"
                        tone={TONE[e.type]}
                        label={tr(`rex.type.${e.type}` as MessageKey)}
                      />{" "}
                      <span className="font-semibold">{section}</span> · {course}
                      {e.new_date ? ` → ${formatDate(e.new_date, locale)}` : ""}
                      {e.rooms ? ` · ${e.rooms.buildings?.code ?? ""}: ${e.rooms.number}` : ""}
                      {e.note ? <span className="block text-text-muted">{e.note}</span> : null}
                    </div>
                    {sp.past !== "1" ? (
                      <ActionForm
                        action={withdrawException}
                        submitLabel={tr("rex.withdraw")}
                        variant="danger"
                      >
                        <Hidden name="id" value={e.id} />
                      </ActionForm>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="font-body text-body text-text-muted">{tr("rex.none")}</p>
          )}
        </Panel>

        <Panel title={tr("rex.new")}>
          {semester ? (
            <div className="flex flex-col gap-5">
              <form className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="font-body text-caption font-semibold text-text-muted">
                      {tr("rte.section")}
                    </span>
                    <select
                      name="section"
                      defaultValue={sp.section ?? ""}
                      required
                      className={inputClass}
                    >
                      <option value="">—</option>
                      {sectionOptions.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="font-body text-caption font-semibold text-text-muted">
                      {tr("rex.date")}
                    </span>
                    <input
                      type="date"
                      name="date"
                      min={today}
                      defaultValue={sp.date ?? today}
                      required
                      className={inputClass}
                    />
                  </label>
                </div>
                <button
                  type="submit"
                  className="h-10 self-start rounded-button border border-border px-4 font-body text-small font-semibold text-text hover:bg-surface-raised"
                >
                  {tr("rex.showClasses")}
                </button>
              </form>
              {step2}
            </div>
          ) : (
            <p className="font-body text-body text-text-muted">{tr("rvw.none")}</p>
          )}
        </Panel>
      </div>
    </div>
  );
}
