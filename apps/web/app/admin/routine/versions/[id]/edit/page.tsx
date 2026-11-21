import Link from "next/link";
import { notFound } from "next/navigation";
import { fill, hasArea, sectionKey, type MessageKey } from "@nfe/core";
import { Card, cx, Panel, Pill } from "@nfe/ui/web";
import { getAdminContext } from "@/lib/admin";
import { clashReport } from "@/lib/routine-editor";
import {
  loadSlots,
  loadVersion,
  loadVersionClasses,
  type LoadedClass,
} from "@/lib/routine-versions";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "../../../../_components/action-form";
import { Hidden, inputClass, SelectField, TextField } from "../../../../_components/fields";
import {
  addSectionOrGroup,
  removeClass,
  renameSectionOrGroup,
  saveClass,
} from "../../../editor-actions";
import { EditorGrid } from "./editor-grid";

type Search = { batch?: string; section?: string; cell?: string; edit?: string };

/**
 * A-2 Routine editor (ADM-RT-5, ADM-RT-6): one section at a time as days ×
 * slots; add, edit, move and remove classes of a draft; add and rename
 * sections and lab groups; live clash marks for the whole draft.
 */
export default async function EditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
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
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const version = await loadVersion(supabase, id);
  if (!version) notFound();
  const viewHref = `/admin/routine/versions/${id}`;
  if (version.status !== "draft") {
    return (
      <Card>
        <p className="font-body text-body text-text">
          {tr("rte.err.notDraft")}{" "}
          <Link href={viewHref} className="font-semibold text-accent">
            {tr("rtp.open")}
          </Link>
        </p>
      </Card>
    );
  }

  const [classes, slots, sectionsRes, groupsRes, coursesRes, facultyRes, roomsRes, homeRes] =
    await Promise.all([
      loadVersionClasses(supabase, id),
      loadSlots(supabase, version.semester_id),
      supabase
        .from("sections")
        .select("id, name, batches(code, status)")
        .is("deleted_at", null)
        .range(0, 9999),
      supabase
        .from("lab_groups")
        .select("id, name, section_id")
        .is("deleted_at", null)
        .range(0, 9999),
      supabase
        .from("courses")
        .select("id, code, title")
        .is("deleted_at", null)
        .neq("status", "archived")
        .order("code"),
      supabase
        .from("faculty_public")
        .select("id, initial, department, full_name, status")
        .is("deleted_at", null)
        .neq("status", "left")
        .order("initial")
        .range(0, 9999),
      supabase
        .from("rooms")
        .select("id, number, type, buildings(code)")
        .is("deleted_at", null)
        .eq("is_active", true)
        .range(0, 9999),
      supabase.from("departments").select("code").eq("is_home", true).maybeSingle(),
    ]);
  const home = homeRes.data?.code ?? null;

  // Sections of active batches, plus any the draft already uses.
  const allSections = (sectionsRes.data ?? [])
    .map((s) => ({
      id: s.id,
      name: s.name,
      batch: s.batches?.code ?? "",
      active: s.batches?.status !== "graduated",
    }))
    .filter((s) => s.batch && (s.active || classes.some((c) => c.sectionId === s.id)));
  const batches = [...new Set(allSections.map((s) => s.batch))].sort((a, b) =>
    b.localeCompare(a, undefined, { numeric: true }),
  );
  const batch = batches.includes(sp.batch ?? "") ? sp.batch! : (batches[0] ?? "");
  const sections = allSections
    .filter((s) => s.batch === batch)
    .sort((a, b) => a.name.localeCompare(b.name));
  const current = sections.find((s) => s.name === sp.section) ?? sections[0] ?? null;
  const groups = (groupsRes.data ?? [])
    .filter((g) => g.section_id === current?.id)
    .sort((a, b) => a.name.localeCompare(b.name));
  const shown = classes.filter((c) => c.sectionId === current?.id);
  const report = clashReport(classes, slots, tr);
  const query = `?${new URLSearchParams({ batch, section: current?.name ?? "" })}`;
  const days = [0, 1, 2, 3, 4, 5, 6]
    .filter((d) => d < 6 || classes.some((c) => c.day === d))
    .map((d) => ({ index: d, label: tr(`day.${d}` as MessageKey) }));
  const editing = sp.edit ? classes.find((c) => c.id === sp.edit) : undefined;
  const [cellDay, cellSlot] = (sp.cell ?? "").split(":");
  const newCell =
    !editing && cellDay !== undefined && slots.some((s) => s.id === cellSlot)
      ? { day: Number(cellDay), timeSlotId: cellSlot! }
      : null;
  const teacher = (c: LoadedClass) =>
    c.facultyDept && c.facultyDept !== home
      ? `${c.facultyInitial}(${c.facultyDept})`
      : c.facultyInitial;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={viewHref} className="font-body text-small font-semibold text-accent">
            ← {fill(tr("rtv.back"), { label: version.label })}
          </Link>
          <h1 className="mt-1 font-display text-display font-bold">
            {fill(tr("rte.title"), { label: version.label })}
          </h1>
          <p className="font-body text-small text-text-muted">
            {fill(tr("rtv.summary"), {
              classes: classes.length,
              sections: new Set(classes.map(sectionKey)).size,
            })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {report.messages.length ? (
            <Pill tone="danger" label={fill(tr("rte.clashCount"), { n: report.messages.length })} />
          ) : (
            <Pill tone="accent" label={tr("rte.noClash")} />
          )}
          <Link
            href={`${viewHref}/publish`}
            className="inline-flex h-10 items-center rounded-button bg-accent px-4 font-body text-small font-semibold text-on-accent hover:opacity-90"
          >
            {tr("rtv.preview")}
          </Link>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <Panel title={current ? `${batch}-${current.name}` : tr("rte.noSection")}>
          <div className="flex flex-wrap gap-1 border-b border-border">
            {batches.map((b) => (
              <Link
                key={b}
                href={`?batch=${b}`}
                aria-current={b === batch ? "page" : undefined}
                className={cx(
                  "-mb-px border-b-2 px-3 py-2 font-body text-body font-semibold",
                  b === batch
                    ? "border-accent text-text"
                    : "border-transparent text-text-muted hover:text-text",
                )}
              >
                {b}
              </Link>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {sections.map((s) => (
              <Link
                key={s.id}
                href={`?batch=${batch}&section=${s.name}`}
                aria-current={s.id === current?.id ? "page" : undefined}
                className={cx(
                  "rounded-lg border px-3 py-1 font-body text-small font-semibold",
                  s.id === current?.id
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-border text-text-muted hover:text-text",
                  classes.some((c) => c.sectionId === s.id && report.byClass.has(c.id)) &&
                    "border-danger text-danger",
                )}
              >
                {batch}-{s.name}
              </Link>
            ))}
          </div>
          {current ? (
            <div className="mt-4">
              <EditorGrid
                versionId={id}
                query={query}
                activeCell={newCell ? `${newCell.day}:${newCell.timeSlotId}` : null}
                slots={slots.map((s) => ({ id: s.id, label: `${s.start}–${s.end}` }))}
                days={days}
                cards={shown.map((c) => ({
                  id: c.id,
                  day: c.day,
                  timeSlotId: c.timeSlotId,
                  title: `${c.courseCode}-${c.labGroup ?? c.sectionLabel}`,
                  lines: [
                    `${teacher(c) || "—"} · ${c.room ? `${c.building}: ${c.room}` : "—"}`,
                    ...(c.note ? [c.note] : []),
                  ],
                  clashes: report.byClass.get(c.id) ?? [],
                  selected: c.id === editing?.id,
                }))}
                labels={{
                  add: tr("rte.add"),
                  moving: tr("rte.moving"),
                  failed: tr("imp.err.generic"),
                }}
              />
              <p className="mt-2 font-body text-caption text-text-faint">{tr("rte.help")}</p>
            </div>
          ) : (
            <p className="mt-4 font-body text-body text-text-muted">{tr("rte.noSectionHelp")}</p>
          )}
        </Panel>

        <div className="flex flex-col gap-6">
          {current && (editing || newCell) ? (
            <Panel
              title={
                editing
                  ? fill(tr("rte.editTitle"), { course: editing.courseCode })
                  : tr("rte.addTitle")
              }
              aside={
                <Link href={query} className="font-body text-small font-semibold text-accent">
                  {tr("md.cancel")}
                </Link>
              }
            >
              <ActionForm
                key={editing?.id ?? sp.cell}
                action={saveClass}
                submitLabel={editing ? tr("md.save") : tr("md.add")}
                resetOnSuccess={!editing}
              >
                <Hidden name="version_id" value={id} />
                {editing ? <Hidden name="id" value={editing.id} /> : null}
                <Hidden name="section_id" value={editing?.sectionId ?? current.id} />
                <div className="grid grid-cols-2 gap-3">
                  <SelectField
                    name="day"
                    label={tr("rte.day")}
                    defaultValue={String(editing?.day ?? newCell!.day)}
                    options={days.map((d) => ({ value: String(d.index), label: d.label }))}
                  />
                  <SelectField
                    name="time_slot_id"
                    label={tr("rte.time")}
                    defaultValue={editing?.timeSlotId ?? newCell!.timeSlotId}
                    options={slots.map((s) => ({ value: s.id, label: `${s.start}–${s.end}` }))}
                  />
                </div>
                <SelectField
                  name="course_id"
                  label={tr("rte.course")}
                  defaultValue={editing?.courseId}
                  options={(coursesRes.data ?? []).map((c) => ({
                    value: c.id,
                    label: c.title ? `${c.code} · ${c.title}` : c.code,
                  }))}
                />
                <div className="grid grid-cols-2 gap-3">
                  <TextField
                    name="section_label"
                    label={tr("rte.sectionLabel")}
                    defaultValue={editing?.sectionLabel ?? current.name}
                    required
                  />
                  <SelectField
                    name="lab_group_id"
                    label={tr("rte.labGroup")}
                    defaultValue={editing?.labGroupId ?? ""}
                    options={[
                      { value: "", label: tr("rte.wholeSection") },
                      ...groups.map((g) => ({ value: g.id, label: g.name })),
                    ]}
                  />
                </div>
                <SelectField
                  name="faculty_id"
                  label={tr("rte.teacher")}
                  defaultValue={editing?.facultyId ?? ""}
                  options={[
                    { value: "", label: "—" },
                    ...(facultyRes.data ?? []).map((f) => ({
                      value: f.id ?? "",
                      label: `${f.department && f.department !== home ? `${f.initial}(${f.department})` : f.initial}${f.full_name ? ` · ${f.full_name}` : ""}`,
                    })),
                  ]}
                />
                <SelectField
                  name="room_id"
                  label={tr("rte.room")}
                  defaultValue={editing?.roomId ?? ""}
                  options={[
                    { value: "", label: "—" },
                    ...(roomsRes.data ?? [])
                      .map((r) => {
                        const day = editing?.day ?? newCell!.day;
                        const slotId = editing?.timeSlotId ?? newCell!.timeSlotId;
                        const busy = classes.find(
                          (c) =>
                            c.roomId === r.id &&
                            c.day === day &&
                            c.timeSlotId === slotId &&
                            c.id !== editing?.id,
                        );
                        const name = `${r.buildings?.code ?? ""}: ${r.number}`;
                        return {
                          value: r.id,
                          label: busy
                            ? fill(tr("rte.roomBusy"), { room: name, by: sectionKey(busy) })
                            : name,
                        };
                      })
                      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true })),
                  ]}
                />
                <div className="grid grid-cols-[100px_1fr] gap-3">
                  <TextField
                    name="span"
                    label={tr("rte.span")}
                    defaultValue={String(editing?.span ?? 1)}
                    type="number"
                  />
                  <TextField name="note" label={tr("rte.note")} defaultValue={editing?.note} />
                </div>
              </ActionForm>
              {editing ? (
                <>
                  {report.byClass.get(editing.id)?.map((m) => (
                    <p key={m} className="mt-3 font-body text-small text-danger">
                      {m}
                    </p>
                  ))}
                  <div className="mt-4">
                    <ActionForm
                      action={removeClass}
                      submitLabel={tr("rte.remove")}
                      variant="danger"
                    >
                      <Hidden name="id" value={editing.id} />
                      <Hidden name="version_id" value={id} />
                      <Hidden name="batch" value={batch} />
                      <Hidden name="section" value={current.name} />
                    </ActionForm>
                  </div>
                </>
              ) : null}
            </Panel>
          ) : null}

          <Panel title={tr("rte.clashes")}>
            {report.messages.length ? (
              <ul className="flex flex-col gap-1">
                {report.messages.map((m) => (
                  <li key={m} className="font-body text-small text-danger">
                    {m}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="font-body text-small text-accent">{tr("rte.noClash")}</p>
            )}
          </Panel>

          <Panel title={tr("rte.sectionsTitle")}>
            <div className="flex flex-col gap-4">
              {current ? (
                <>
                  <p className="font-body text-small text-text-muted">
                    {fill(tr("rte.groupsOf"), { section: `${batch}-${current.name}` })}{" "}
                    {groups.map((g) => g.name).join(", ") || "—"}
                  </p>
                  <ActionForm
                    action={addSectionOrGroup}
                    submitLabel={tr("rte.addGroup")}
                    variant="secondary"
                  >
                    <Hidden name="version_id" value={id} />
                    <Hidden name="kind" value="lab_group" />
                    <Hidden name="section_id" value={current.id} />
                    <Hidden name="batch" value={batch} />
                    <Hidden name="section" value={current.name} />
                    <TextField
                      name="name"
                      label={tr("rte.groupName")}
                      placeholder={`${current.name}1`}
                      required
                    />
                  </ActionForm>
                  <ActionForm
                    action={renameSectionOrGroup}
                    submitLabel={tr("rte.rename")}
                    variant="secondary"
                  >
                    <Hidden name="version_id" value={id} />
                    <Hidden name="batch" value={batch} />
                    <Hidden name="section" value={current.name} />
                    <label className="flex flex-col gap-1">
                      <span className="font-body text-caption font-semibold text-text-muted">
                        {tr("rte.renameWhat")}
                      </span>
                      <select
                        name="target"
                        className={inputClass}
                        defaultValue={`section:${current.id}`}
                      >
                        <option
                          value={`section:${current.id}`}
                        >{`${batch}-${current.name}`}</option>
                        {groups.map((g) => (
                          <option key={g.id} value={`lab_group:${g.id}`}>
                            {g.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <TextField name="name" label={tr("rte.newName")} required />
                  </ActionForm>
                </>
              ) : null}
              <ActionForm
                action={addSectionOrGroup}
                submitLabel={tr("rte.addSection")}
                variant="secondary"
              >
                <Hidden name="version_id" value={id} />
                <Hidden name="kind" value="section" />
                <div className="grid grid-cols-2 gap-3">
                  <TextField
                    name="batch"
                    label={tr("rte.batch")}
                    defaultValue={batch}
                    placeholder="263"
                    required
                  />
                  <TextField name="section" label={tr("rte.section")} placeholder="G" required />
                </div>
              </ActionForm>
              <p className="font-body text-caption text-text-faint">{tr("rte.sectionsHelp")}</p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
