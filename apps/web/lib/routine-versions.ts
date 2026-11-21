import "server-only";
import { fill, type MessageKey, type VersionClass } from "@nfe/core";
import { diffRoutines, type Change } from "@nfe/parser";
import type { AppState } from "./app-state";
import type { createClient } from "./supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type Tr = AppState["tr"];

export interface VersionRow {
  id: string;
  semester_id: string;
  label: string;
  status: "draft" | "published" | "archived";
  source: "import" | "manual" | "rollback";
  effective_from: string | null;
  published_at: string | null;
  created_at: string;
  notes: string | null;
}

export interface Slot {
  id: string;
  position: number;
  start: string;
  end: string;
}

const VERSION_COLUMNS =
  "id, semester_id, label, status, source, effective_from, published_at, created_at, notes";

/** A version the admin can see (RLS: routine area sees drafts too). */
export async function loadVersion(supabase: Supabase, id: string): Promise<VersionRow | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await supabase
    .from("routine_versions")
    .select(VERSION_COLUMNS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  return data;
}

/** The published version in effect today for a semester (same rule as `version_in_effect`). */
export async function versionInEffect(
  supabase: Supabase,
  semesterId: string,
): Promise<VersionRow | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("routine_versions")
    .select(VERSION_COLUMNS)
    .eq("semester_id", semesterId)
    .eq("status", "published")
    .is("deleted_at", null)
    .or(`effective_from.is.null,effective_from.lte.${today}`)
    .order("effective_from", { ascending: false, nullsFirst: false })
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data;
}

export async function loadSlots(supabase: Supabase, semesterId: string): Promise<Slot[]> {
  const { data } = await supabase
    .from("time_slots")
    .select("id, position, start_time, end_time")
    .eq("semester_id", semesterId)
    .is("deleted_at", null)
    .order("position");
  return (data ?? []).map((s) => ({
    id: s.id,
    position: s.position,
    start: s.start_time.slice(0, 5),
    end: s.end_time.slice(0, 5),
  }));
}

/** Ids behind a class, for the editor's forms. */
export interface ClassIds {
  sectionId: string;
  labGroupId: string | null;
  courseId: string;
  facultyId: string | null;
  roomId: string | null;
  timeSlotId: string;
}

export type LoadedClass = VersionClass & ClassIds;

/** Every class of a version with codes and names, ready for the grid and the diff. */
export async function loadVersionClasses(
  supabase: Supabase,
  versionId: string,
): Promise<LoadedClass[]> {
  const [{ data: slots }, { data: faculty }] = await Promise.all([
    supabase
      .from("class_slots")
      .select(
        "id, day, span, note, section_label, section_id, lab_group_id, course_id, faculty_id, room_id, time_slot_id, sections(name, batches(code)), lab_groups(name), courses(code, title), rooms(number, buildings(code)), time_slots(position)",
      )
      .eq("version_id", versionId)
      .is("deleted_at", null)
      .range(0, 9999),
    supabase.from("faculty_public").select("id, initial, department, full_name").range(0, 9999),
  ]);
  const teacher = new Map((faculty ?? []).map((f) => [f.id, f]));
  return (slots ?? []).map((s) => {
    const f = s.faculty_id ? teacher.get(s.faculty_id) : undefined;
    return {
      id: s.id,
      batch: s.sections?.batches?.code ?? "",
      section: s.sections?.name ?? "",
      labGroup: s.lab_groups?.name ?? null,
      courseCode: s.courses?.code ?? "",
      courseTitle: s.courses?.title ?? null,
      sectionLabel: s.section_label,
      facultyInitial: f?.initial ?? "",
      facultyDept: f?.department ?? null,
      facultyName: f?.full_name ?? null,
      building: s.rooms?.buildings?.code ?? "",
      room: s.rooms?.number ?? "",
      day: s.day,
      slot: s.time_slots?.position ?? 0,
      span: s.span,
      note: s.note,
      sectionId: s.section_id,
      labGroupId: s.lab_group_id,
      courseId: s.course_id,
      facultyId: s.faculty_id,
      roomId: s.room_id,
      timeSlotId: s.time_slot_id,
    };
  });
}

export function diffVersions(before: VersionClass[], after: VersionClass[]) {
  return diffRoutines(before, after);
}

const at = (tr: Tr, slots: Slot[], c: VersionClass) =>
  `${tr(`day.${c.day}` as MessageKey)} ${slots.find((s) => s.position === c.slot)?.start ?? ""}`;

const where = (c: VersionClass) => `${c.building}: ${c.room}`;

/** One change in plain words: "0711-1101 moved: Tuesday 11:20 → Tuesday 14:40". */
export function describeChange(tr: Tr, slots: Slot[], ch: Change<VersionClass>): string {
  const c = (ch.after ?? ch.before)!;
  const course = c.labGroup ? `${c.courseCode} (${c.labGroup})` : c.courseCode;
  if (ch.kind === "added") {
    return fill(tr("rtp.change.added"), {
      course,
      when: at(tr, slots, c),
      who: `${c.facultyInitial} · ${where(c)}`,
    });
  }
  if (ch.kind === "removed")
    return fill(tr("rtp.change.removed"), { course, when: at(tr, slots, c) });
  const b = ch.before!;
  const a = ch.after!;
  const details = [
    b.facultyInitial !== a.facultyInitial
      ? fill(tr("rtp.change.teacher"), { from: b.facultyInitial, to: a.facultyInitial })
      : null,
    where(b) !== where(a) ? fill(tr("rtp.change.room"), { from: where(b), to: where(a) }) : null,
  ].filter(Boolean);
  if (ch.kind === "moved") {
    return fill(tr("rtp.change.moved"), {
      course,
      from: at(tr, slots, b),
      to: at(tr, slots, a),
      details: details.length ? ` (${details.join(", ")})` : "",
    });
  }
  return fill(tr("rtp.change.changed"), {
    course,
    when: at(tr, slots, a),
    details: details.join(", "),
  });
}
