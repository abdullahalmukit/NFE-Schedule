/**
 * Personal routine for a date (RT-1; docs/DATABASE.md §2–3). One pure
 * function used by the web, the phone, the Home widget and the reminder
 * scheduler. Inputs are plain rows as they are stored locally (snake_case
 * like the database, so synced rows can be passed straight in).
 */
import { dayIndexOfDate } from "./exceptions";
import { toMinutes } from "../format/time";

export interface VersionRowLite {
  id: string;
  semester_id: string;
  status: "draft" | "published" | "archived";
  effective_from: string | null;
  published_at: string | null;
  deleted_at?: string | null;
}

export interface ClassSlotRow {
  id: string;
  version_id: string;
  section_id: string;
  lab_group_id: string | null;
  course_id: string;
  section_label: string;
  faculty_id: string | null;
  room_id: string | null;
  day: number;
  time_slot_id: string;
  span: number;
  note: string | null;
  deleted_at?: string | null;
}

export interface TimeSlotRow {
  id: string;
  position: number;
  /** "08:20" or "08:20:00". */
  start_time: string;
  end_time: string;
  deleted_at?: string | null;
}

export interface ExceptionRow {
  id: string;
  class_slot_id: string | null;
  section_id: string;
  lab_group_id: string | null;
  date: string;
  type: "cancelled" | "rescheduled" | "room_change" | "makeup";
  course_id: string | null;
  faculty_id: string | null;
  new_date: string | null;
  new_time_slot_id: string | null;
  new_start: string | null;
  new_end: string | null;
  new_room_id: string | null;
  note: string | null;
  deleted_at?: string | null;
}

export interface CalendarDayRow {
  date: string;
  end_date: string | null;
  type: "holiday" | "exam_week" | "no_class" | "special";
  title: string | null;
  applies_to: unknown;
  deleted_at?: string | null;
}

export interface ExtraEnrolment {
  course_id: string;
  section_id: string;
  lab_group_id: string | null;
}

export interface Student {
  batchId: string | null;
  sectionId: string;
  labGroupId: string | null;
  extra?: readonly ExtraEnrolment[];
}

export interface RoutineData {
  semesterId: string;
  versions: readonly VersionRowLite[];
  slots: readonly ClassSlotRow[];
  timeSlots: readonly TimeSlotRow[];
  exceptions?: readonly ExceptionRow[];
  calendar?: readonly CalendarDayRow[];
  /** `app_settings.week.working_days` (default Saturday–Thursday). */
  workingDays?: readonly number[];
}

export type EntryStatus = "normal" | "cancelled" | "room_changed" | "moved_here" | "makeup";

export interface RoutineEntry {
  /** Class slot id, or the exception id for a makeup class. */
  key: string;
  classSlotId: string | null;
  exceptionId: string | null;
  courseId: string;
  sectionId: string;
  sectionLabel: string | null;
  labGroupId: string | null;
  facultyId: string | null;
  roomId: string | null;
  /** "08:20" (24 h). */
  start: string;
  end: string;
  status: EntryStatus;
  /** Own section, or a retake / improvement class from another section. */
  source: "own" | "extra";
  note: string | null;
}

export interface MovedAway {
  classSlotId: string;
  exceptionId: string;
  toDate: string | null;
  toStart: string | null;
}

export interface DayRoutine {
  date: string;
  /** Version in effect on the date (null before the first publish). */
  versionId: string | null;
  /** Holiday, no-class day or exam week: no classes are shown. */
  off: { type: CalendarDayRow["type"]; title: string | null } | null;
  entries: RoutineEntry[];
  /** Classes of the day moved to another date or time (shown as a note). */
  movedAway: MovedAway[];
  /** Sessions of the student's section for another lab group, not shown (RT-2 note). */
  hiddenLabSessions: number;
}

const live = <T extends { deleted_at?: string | null }>(rows: readonly T[] | undefined) =>
  (rows ?? []).filter((r) => !r.deleted_at);

/** Same rule as SQL `version_in_effect`: latest published with effective_from ≤ date. */
export function versionInEffectFor(
  versions: readonly VersionRowLite[],
  semesterId: string,
  date: string,
): VersionRowLite | null {
  return (
    live(versions)
      .filter(
        (v) =>
          v.semester_id === semesterId &&
          v.status === "published" &&
          (v.effective_from ?? "0000-00-00") <= date,
      )
      .sort(
        (a, b) =>
          (b.effective_from ?? "").localeCompare(a.effective_from ?? "") ||
          (b.published_at ?? "").localeCompare(a.published_at ?? ""),
      )[0] ?? null
  );
}

/** The calendar day covering a date that applies to the student's batch, if any. */
export function calendarDayFor(
  calendar: readonly CalendarDayRow[] | undefined,
  date: string,
  batchId: string | null,
): CalendarDayRow | null {
  return (
    live(calendar).find((c) => {
      if (date < c.date || date > (c.end_date ?? c.date)) return false;
      const ids = (c.applies_to as { batch_ids?: unknown } | null)?.batch_ids;
      return !Array.isArray(ids) || (batchId !== null && ids.includes(batchId));
    }) ?? null
  );
}

const hhmm = (t: string) => t.slice(0, 5);

export function routineFor(data: RoutineData, student: Student, date: string): DayRoutine {
  const day = dayIndexOfDate(date);
  const empty: DayRoutine = {
    date,
    versionId: null,
    off: null,
    entries: [],
    movedAway: [],
    hiddenLabSessions: 0,
  };
  if (!(data.workingDays ?? [0, 1, 2, 3, 4, 5]).includes(day)) return empty;
  const cal = calendarDayFor(data.calendar, date, student.batchId);
  if (cal && cal.type !== "special") {
    return { ...empty, off: { type: cal.type, title: cal.title } };
  }

  const version = versionInEffectFor(data.versions, data.semesterId, date);
  const slotsById = new Map(live(data.timeSlots).map((s) => [s.id, s]));
  const slotsByPos = new Map(live(data.timeSlots).map((s) => [s.position, s]));
  const timeOf = (timeSlotId: string, span = 1) => {
    const first = slotsById.get(timeSlotId);
    if (!first) return null;
    const last = slotsByPos.get(first.position + Math.max(1, span) - 1) ?? first;
    return { start: hhmm(first.start_time), end: hhmm(last.end_time) };
  };

  const extra = student.extra ?? [];
  const sourceOf = (s: {
    section_id: string;
    lab_group_id: string | null;
    course_id: string | null;
  }) => {
    if (
      s.section_id === student.sectionId &&
      (!s.lab_group_id || s.lab_group_id === student.labGroupId)
    ) {
      return "own" as const;
    }
    const e = extra.find(
      (x) =>
        x.section_id === s.section_id &&
        (s.course_id === null || x.course_id === s.course_id) &&
        (!s.lab_group_id || !x.lab_group_id || x.lab_group_id === s.lab_group_id),
    );
    return e ? ("extra" as const) : null;
  };

  const versionSlots = live(data.slots).filter((s) => s.version_id === version?.id);
  const slotById = new Map(live(data.slots).map((s) => [s.id, s]));
  const exceptions = live(data.exceptions);

  const entries: RoutineEntry[] = [];
  const movedAway: MovedAway[] = [];
  const add = (
    s: ClassSlotRow,
    source: "own" | "extra",
    status: EntryStatus,
    at = timeOf(s.time_slot_id, s.span),
    ex?: ExceptionRow,
  ) => {
    if (!at) return;
    entries.push({
      key: ex && status === "moved_here" ? ex.id : s.id,
      classSlotId: s.id,
      exceptionId: ex?.id ?? null,
      courseId: s.course_id,
      sectionId: s.section_id,
      sectionLabel: s.section_label,
      labGroupId: s.lab_group_id,
      facultyId: s.faculty_id,
      roomId: ex?.new_room_id ?? s.room_id,
      start: at.start,
      end: at.end,
      status,
      source,
      note: ex?.note ?? s.note,
    });
  };

  let hiddenLabSessions = 0;
  for (const s of versionSlots) {
    if (s.day !== day) continue;
    const source = sourceOf(s);
    if (!source) {
      if (s.section_id === student.sectionId && s.lab_group_id) hiddenLabSessions += 1;
      continue;
    }
    const ex = exceptions.find((e) => e.class_slot_id === s.id && e.date === date);
    if (ex?.type === "rescheduled") {
      const to = ex.new_time_slot_id ? timeOf(ex.new_time_slot_id, s.span) : null;
      if (!ex.new_date || ex.new_date === date) {
        // Same day, another time: shown at the new time.
        add(s, source, "moved_here", to ?? undefined, ex);
      } else {
        movedAway.push({
          classSlotId: s.id,
          exceptionId: ex.id,
          toDate: ex.new_date,
          toStart: to?.start ?? null,
        });
      }
      continue;
    }
    if (ex?.type === "cancelled") add(s, source, "cancelled", undefined, ex);
    else if (ex?.type === "room_change") add(s, source, "room_changed", undefined, ex);
    else add(s, source, "normal");
  }

  // Classes rescheduled to this date from another date.
  for (const ex of exceptions) {
    if (ex.type !== "rescheduled" || ex.new_date !== date || ex.date === date || !ex.class_slot_id)
      continue;
    const s = slotById.get(ex.class_slot_id);
    const source = s ? sourceOf(s) : null;
    if (!s || !source) continue;
    const to = ex.new_time_slot_id ? timeOf(ex.new_time_slot_id, s.span) : null;
    add(s, source, "moved_here", to ?? undefined, ex);
  }

  // Makeup classes.
  for (const ex of exceptions) {
    if (ex.type !== "makeup" || ex.date !== date || !ex.course_id) continue;
    const source = sourceOf(ex);
    if (!source) continue;
    const at = ex.new_time_slot_id
      ? timeOf(ex.new_time_slot_id)
      : ex.new_start && ex.new_end
        ? { start: hhmm(ex.new_start), end: hhmm(ex.new_end) }
        : null;
    if (!at) continue;
    entries.push({
      key: ex.id,
      classSlotId: null,
      exceptionId: ex.id,
      courseId: ex.course_id,
      sectionId: ex.section_id,
      sectionLabel: null,
      labGroupId: ex.lab_group_id,
      facultyId: ex.faculty_id,
      roomId: ex.new_room_id,
      start: at.start,
      end: at.end,
      status: "makeup",
      source,
      note: ex.note,
    });
  }

  entries.sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
  return { date, versionId: version?.id ?? null, off: null, entries, movedAway, hiddenLabSessions };
}

/** Seven days from `startDate` (RT-3 weekly view). */
export function weekRoutine(data: RoutineData, student: Student, startDate: string): DayRoutine[] {
  const [y, m, d] = startDate.split("-").map(Number);
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(Date.UTC(y!, m! - 1, d! + i)).toISOString().slice(0, 10);
    return routineFor(data, student, day);
  });
}

export interface FreeGap {
  start: string;
  end: string;
  minutes: number;
}

/** Free time between classes that take place (cancelled ones leave a gap), RT-2. */
export function freeGaps(entries: readonly RoutineEntry[], minMinutes = 1): FreeGap[] {
  const held = entries.filter((e) => e.status !== "cancelled");
  const gaps: FreeGap[] = [];
  let lastEnd: string | null = null;
  for (const e of held) {
    if (lastEnd && toMinutes(e.start) - toMinutes(lastEnd) >= minMinutes) {
      gaps.push({ start: lastEnd, end: e.start, minutes: toMinutes(e.start) - toMinutes(lastEnd) });
    }
    if (!lastEnd || e.end > lastEnd) lastEnd = e.end;
  }
  return gaps;
}
