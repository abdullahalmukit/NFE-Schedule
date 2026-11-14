/**
 * Routine import review (ADM-RT-2, ADM-RT-10; docs/ROUTINE_IMPORT.md §2–3):
 * compares a parsed routine file with the database and says what is missing,
 * what is new, what must be decided and whether the draft can be saved.
 * Pure functions; the parser output is passed in (core does not depend on
 * `@nfe/parser`, the shapes below match its `ParsedRoutine`).
 */
import { floorFromRoomNumber } from "../master/normalize";

export interface RoutineClass {
  batch: string;
  section: string;
  day: number;
  slot: number;
  span: number;
  coursePrefix: string | null;
  courseCode: string;
  sectionLabel: string;
  labGroup: string | null;
  facultyInitial: string;
  facultyDept: string | null;
  building: string;
  room: string;
  raw: string[];
}

export interface RoutineIssue {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  table?: string;
  day?: number;
  slot?: number;
  raw?: string[];
}

export interface RoutineSlot {
  position: number;
  start: string;
  end: string;
  label?: string | null;
}

export interface RoutineParse {
  timeSlots: RoutineSlot[];
  tables: { batch: string; section: string; index: number }[];
  classes: RoutineClass[];
  issues: RoutineIssue[];
}

export interface RoutineExisting {
  /** Code of the home department (NFE); initials without "(DEPT)" belong to it. */
  homeDepartment: string | null;
  departments: readonly string[];
  courses: readonly { code: string; title: string | null }[];
  /** Teachers that are not deleted, any status. */
  faculty: readonly {
    initial: string;
    department: string | null;
    status: "active" | "on_leave" | "left";
    full_name: string | null;
    is_guest: boolean;
  }[];
  /** Batches that are not deleted, with their sections and lab groups. */
  batches: readonly {
    code: string;
    status: "active" | "graduated";
    sections: readonly { name: string; labGroups: readonly string[] }[];
  }[];
  buildings: readonly string[];
  rooms: readonly { building: string; number: string }[];
  /** Time slots of the chosen semester. */
  timeSlots: readonly RoutineSlot[];
  floorRule: "first_digit" | "manual";
}

/** The admin's decisions on the review screen (stored in `import_runs.result.overrides`). */
export interface RoutineOverrides {
  /** Tables whose cross-section lab groups are renamed to the table's section ("D1" → "B1"). */
  renameLabGroups: string[];
  /** Warning ids accepted as written. */
  accepted: string[];
  /** Batches to mark graduated (students → alumni) when the version is published. */
  graduate: string[];
  /** When the file's times differ from the semester's: keep the semester's or take the file's. */
  timeSlots: "keep" | "update" | null;
}

export const EMPTY_OVERRIDES: RoutineOverrides = {
  renameLabGroups: [],
  accepted: [],
  graduate: [],
  timeSlots: null,
};

/** Overrides from stored JSON (unknown keys and bad values dropped). */
export function readOverrides(value: unknown): RoutineOverrides {
  const v = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const strings = (x: unknown) =>
    Array.isArray(x) ? [...new Set(x.filter((s): s is string => typeof s === "string"))] : [];
  return {
    renameLabGroups: strings(v.renameLabGroups),
    accepted: strings(v.accepted),
    graduate: strings(v.graduate),
    timeSlots: v.timeSlots === "keep" || v.timeSlots === "update" ? v.timeSlots : null,
  };
}

const title = (c: { batch: string; section: string }) => `${c.batch}-${c.section}`;

/** Stable id of a warning: code, table, day and slot. */
export function warningId(i: RoutineIssue): string {
  return [i.code, i.table ?? "", i.day ?? "", i.slot ?? "", i.raw?.[0] ?? ""].join(":");
}

/**
 * The classes as they will be saved: lab groups of the tables in
 * `renameLabGroups` take the table's section letter ("D1" in 261-B → "B1").
 * `sectionLabel` always keeps the letter as written.
 */
export function effectiveClasses(
  classes: readonly RoutineClass[],
  overrides: RoutineOverrides,
): RoutineClass[] {
  const rename = new Set(overrides.renameLabGroups);
  return classes.map((c) =>
    c.labGroup && c.sectionLabel !== c.section && rename.has(title(c))
      ? { ...c, labGroup: `${c.section}${c.labGroup.slice(c.sectionLabel.length)}` }
      : c,
  );
}

// ------------------------------------------------------------------ review

export interface ReviewFaculty {
  initial: string;
  department: string | null;
  classesPerWeek: number;
  /** Teacher from another department ("NI(ITM)"). */
  guest: boolean;
  /** No teacher with this initial yet, or one without a name. */
  isNew: boolean;
}

export interface ReviewCourse {
  code: string;
  prefix: string | null;
  detectedType: "theory" | "lab";
  sessions: number;
  isNew: boolean;
}

export interface ReviewBatch {
  code: string;
  sections: number;
  labGroups: number;
  tag: "new" | "graduating" | null;
}

export type SuggestionKind =
  | "leftTeacher"
  | "absentTeacher"
  | "guestTeacher"
  | "newCourse"
  | "newBatch"
  | "graduatingBatch"
  | "timeSlots";

export interface Suggestion {
  kind: SuggestionKind;
  /** Initial, code or batch the suggestion is about. */
  subject: string;
}

export interface ReviewWarning {
  id: string;
  code: string;
  table: string | null;
  day: number | null;
  slot: number | null;
  raw: string[];
  /** Accepted (or decided through a lab-group rename). */
  done: boolean;
  /** Cross-section lab group: the admin chooses keep / rename for the whole table. */
  labGroupTable: string | null;
}

export interface NewRoom {
  building: string;
  number: string;
  floor: number | null;
  type: "classroom" | "lab" | "gym";
}

export type Blocker = "errors" | "warnings" | "timeSlots" | "missingSlots" | "noClasses";

export interface RoutineReview {
  stats: {
    tables: number;
    classes: number;
    labSessions: number;
    clashes: number;
    teacherClashes: number;
    roomClashes: number;
    unreadable: number;
    roomsFound: number;
  };
  faculty: ReviewFaculty[];
  courses: ReviewCourse[];
  batches: ReviewBatch[];
  suggestions: Suggestion[];
  warnings: ReviewWarning[];
  errors: RoutineIssue[];
  newItems: {
    departments: string[];
    batches: string[];
    sections: { batch: string; name: string }[];
    labGroups: { batch: string; section: string; name: string }[];
    buildings: string[];
    rooms: NewRoom[];
  };
  timeSlots: { status: "create" | "same" | "differs"; file: RoutineSlot[] };
  blockers: Blocker[];
}

const UNREADABLE = new Set([
  "BAD_TITLE",
  "BAD_HEADER",
  "BAD_DAY",
  "BAD_CELL_LINES",
  "BAD_COURSE_LINE",
  "BAD_FACULTY_LINE",
  "BAD_ROOM_LINE",
]);

const facultyKey = (initial: string, dept: string | null) =>
  `${initial.toUpperCase()}|${(dept ?? "").toUpperCase()}`;

export function buildRoutineReview(
  parsed: RoutineParse,
  existing: RoutineExisting,
  overrides: RoutineOverrides,
): RoutineReview {
  const classes = effectiveClasses(parsed.classes, overrides);
  const home = existing.homeDepartment?.toUpperCase() ?? null;
  const deptOf = (d: string | null) => (d ?? home)?.toUpperCase() ?? null;

  // Faculty.
  const byFaculty = new Map<string, { initial: string; dept: string | null; n: number }>();
  for (const c of classes) {
    const k = facultyKey(c.facultyInitial, deptOf(c.facultyDept));
    const f = byFaculty.get(k) ?? { initial: c.facultyInitial, dept: deptOf(c.facultyDept), n: 0 };
    f.n += 1;
    byFaculty.set(k, f);
  }
  const dbFaculty = new Map<string, RoutineExisting["faculty"][number]>();
  const leftFaculty = new Set<string>();
  for (const f of existing.faculty) {
    const k = facultyKey(f.initial, deptOf(f.department));
    if (f.status === "left") leftFaculty.add(k);
    else dbFaculty.set(k, f);
  }
  const faculty: ReviewFaculty[] = [];
  const suggestions: Suggestion[] = [];
  for (const [k, f] of byFaculty) {
    const db = dbFaculty.get(k);
    const guest = f.dept !== null && f.dept !== home;
    const subject = guest ? `${f.initial}(${f.dept})` : f.initial;
    if (!db && leftFaculty.has(k)) suggestions.push({ kind: "leftTeacher", subject });
    if (guest && !db) suggestions.push({ kind: "guestTeacher", subject });
    if (!db || !db.full_name) {
      faculty.push({
        initial: f.initial,
        department: f.dept,
        classesPerWeek: f.n,
        guest,
        isNew: !db,
      });
    }
  }
  for (const [k, f] of dbFaculty) {
    if (f.status === "active" && !f.is_guest && !byFaculty.has(k)) {
      suggestions.push({ kind: "absentTeacher", subject: f.initial });
    }
  }
  faculty.sort((a, b) => b.classesPerWeek - a.classesPerWeek || a.initial.localeCompare(b.initial));

  // Courses.
  const byCourse = new Map<string, ReviewCourse>();
  for (const c of classes) {
    const r = byCourse.get(c.courseCode) ?? {
      code: c.courseCode,
      prefix: c.coursePrefix,
      detectedType: "theory" as const,
      sessions: 0,
      isNew: false,
    };
    r.sessions += 1;
    if (c.labGroup) r.detectedType = "lab";
    byCourse.set(c.courseCode, r);
  }
  const dbCourses = new Map(existing.courses.map((c) => [c.code.toUpperCase(), c]));
  const courses: ReviewCourse[] = [];
  for (const r of byCourse.values()) {
    const db = dbCourses.get(r.code.toUpperCase());
    if (!db) suggestions.push({ kind: "newCourse", subject: r.code });
    if (!db || !db.title) courses.push({ ...r, isNew: !db });
  }
  courses.sort((a, b) => a.code.localeCompare(b.code));

  // Batches, sections, lab groups.
  const fileBatches = new Map<string, Map<string, Set<string>>>();
  for (const t of parsed.tables) {
    const b = fileBatches.get(t.batch) ?? new Map<string, Set<string>>();
    if (!b.has(t.section)) b.set(t.section, new Set());
    fileBatches.set(t.batch, b);
  }
  for (const c of classes) {
    if (c.labGroup) fileBatches.get(c.batch)?.get(c.section)?.add(c.labGroup);
  }
  const dbBatches = new Map(existing.batches.map((b) => [b.code, b]));
  const batches: ReviewBatch[] = [];
  const newItems: RoutineReview["newItems"] = {
    departments: [],
    batches: [],
    sections: [],
    labGroups: [],
    buildings: [],
    rooms: [],
  };
  for (const [code, sections] of fileBatches) {
    const db = dbBatches.get(code);
    const isNew = !db || db.status === "graduated";
    if (!db) newItems.batches.push(code);
    if (isNew) suggestions.push({ kind: "newBatch", subject: code });
    let labGroups = 0;
    for (const [name, groups] of sections) {
      labGroups += groups.size;
      const dbSection = db?.sections.find((s) => s.name === name);
      if (!dbSection) newItems.sections.push({ batch: code, name });
      for (const g of [...groups].sort()) {
        if (!dbSection?.labGroups.includes(g)) {
          newItems.labGroups.push({ batch: code, section: name, name: g });
        }
      }
    }
    batches.push({ code, sections: sections.size, labGroups, tag: isNew ? "new" : null });
  }
  for (const b of existing.batches) {
    if (b.status === "active" && !fileBatches.has(b.code)) {
      batches.push({ code: b.code, sections: b.sections.length, labGroups: 0, tag: "graduating" });
      suggestions.push({ kind: "graduatingBatch", subject: b.code });
    }
  }
  batches.sort((a, b) => b.code.localeCompare(a.code));

  // Departments of guest teachers.
  const knownDepts = new Set(existing.departments.map((d) => d.toUpperCase()));
  for (const f of byFaculty.values()) {
    if (f.dept && !knownDepts.has(f.dept) && !newItems.departments.includes(f.dept)) {
      newItems.departments.push(f.dept);
    }
  }

  // Buildings and rooms.
  const knownBuildings = new Set(existing.buildings.map((b) => b.toUpperCase()));
  const knownRooms = new Set(
    existing.rooms.map((r) => `${r.building.toUpperCase()}|${r.number.toUpperCase()}`),
  );
  const roomUse = new Map<string, { building: string; number: string; lab: number; all: number }>();
  for (const c of classes) {
    const k = `${c.building.toUpperCase()}|${c.room.toUpperCase()}`;
    const r = roomUse.get(k) ?? { building: c.building, number: c.room, lab: 0, all: 0 };
    r.all += 1;
    if (c.labGroup) r.lab += 1;
    roomUse.set(k, r);
  }
  for (const [k, r] of roomUse) {
    if (!knownBuildings.has(r.building.toUpperCase()) && !newItems.buildings.includes(r.building)) {
      newItems.buildings.push(r.building);
    }
    if (knownRooms.has(k)) continue;
    newItems.rooms.push({
      building: r.building,
      number: r.number,
      floor: floorFromRoomNumber(r.number, existing.floorRule),
      type: /^gym$/i.test(r.building) ? "gym" : r.lab === r.all ? "lab" : "classroom",
    });
  }

  // Time slots.
  const same = (a: readonly RoutineSlot[], b: readonly RoutineSlot[]) =>
    a.length === b.length &&
    a.every(
      (s, i) => s.position === b[i]!.position && s.start === b[i]!.start && s.end === b[i]!.end,
    );
  const semesterSlots = [...existing.timeSlots].sort((a, b) => a.position - b.position);
  const timeStatus = !semesterSlots.length
    ? "create"
    : same(parsed.timeSlots, semesterSlots)
      ? "same"
      : "differs";
  if (timeStatus === "differs") suggestions.push({ kind: "timeSlots", subject: "" });

  // Warnings and errors.
  const accepted = new Set(overrides.accepted);
  const renamed = new Set(overrides.renameLabGroups);
  const warnings: ReviewWarning[] = parsed.issues
    .filter((i) => i.severity === "warning")
    .map((i) => {
      const id = warningId(i);
      const cls = classes.find((c) => title(c) === i.table && c.day === i.day && c.slot === i.slot);
      const original = parsed.classes.find(
        (c) => title(c) === i.table && c.day === i.day && c.slot === i.slot,
      );
      const labGroupTable =
        i.code === "CROSS_SECTION_LABEL" && original?.labGroup ? (i.table ?? null) : null;
      return {
        id,
        code: i.code,
        table: i.table ?? null,
        day: i.day ?? null,
        slot: i.slot ?? null,
        raw: i.raw ?? cls?.raw ?? [],
        done: accepted.has(id) || (labGroupTable !== null && renamed.has(labGroupTable)),
        labGroupTable,
      };
    });
  const errors = parsed.issues.filter((i) => i.severity === "error");

  const blockers: Blocker[] = [];
  if (errors.length) blockers.push("errors");
  if (warnings.some((w) => !w.done)) blockers.push("warnings");
  if (timeStatus === "differs" && !overrides.timeSlots) blockers.push("timeSlots");
  if (timeStatus === "differs" && overrides.timeSlots === "keep") {
    const positions = new Set(semesterSlots.map((s) => s.position));
    if (classes.some((c) => !positions.has(c.slot))) blockers.push("missingSlots");
  }
  if (!classes.length) blockers.push("noClasses");

  const count = (code: string) => errors.filter((e) => e.code === code).length;
  return {
    stats: {
      tables: parsed.tables.length,
      classes: classes.length,
      labSessions: classes.filter((c) => c.labGroup).length,
      teacherClashes: count("TEACHER_CLASH"),
      roomClashes: count("ROOM_CLASH"),
      clashes: count("TEACHER_CLASH") + count("ROOM_CLASH") + count("SECTION_CLASH"),
      unreadable: parsed.issues.filter((i) => UNREADABLE.has(i.code) && i.severity === "error")
        .length,
      roomsFound: roomUse.size,
    },
    faculty,
    courses,
    batches,
    suggestions,
    warnings,
    errors,
    newItems,
    timeSlots: { status: timeStatus, file: parsed.timeSlots },
    blockers,
  };
}

// ------------------------------------------------------------------ apply plan

/** What `apply_routine_import` receives; everything is addressed by codes. */
export interface RoutineApplyPlan {
  semester_id: string;
  label: string;
  source_file_path: string | null;
  /** Write the file's time slots to the semester (none yet, or the admin chose "update"). */
  time_slots: RoutineSlot[] | null;
  departments: string[];
  courses: { code: string; prefix: string | null; type: "theory" | "lab" }[];
  faculty: { initial: string; department: string | null }[];
  batches: string[];
  sections: { batch: string; name: string }[];
  lab_groups: { batch: string; section: string; name: string }[];
  buildings: string[];
  rooms: NewRoom[];
  classes: {
    batch: string;
    section: string;
    lab_group: string | null;
    course: string;
    section_label: string;
    initial: string;
    department: string | null;
    building: string;
    room: string;
    day: number;
    position: number;
    span: number;
    raw: string[];
  }[];
}

/** Null while something blocks saving the draft. */
export function routineApplyPlan(input: {
  parsed: RoutineParse;
  review: RoutineReview;
  overrides: RoutineOverrides;
  existing: RoutineExisting;
  semesterId: string;
  label: string;
  sourceFilePath: string | null;
}): RoutineApplyPlan | null {
  const { parsed, review, overrides, existing } = input;
  if (review.blockers.length) return null;
  const home = existing.homeDepartment?.toUpperCase() ?? null;
  const classes = effectiveClasses(parsed.classes, overrides);
  const writeSlots =
    review.timeSlots.status === "create" ||
    (review.timeSlots.status === "differs" && overrides.timeSlots === "update");
  return {
    semester_id: input.semesterId,
    label: input.label,
    source_file_path: input.sourceFilePath,
    time_slots: writeSlots ? parsed.timeSlots : null,
    departments: review.newItems.departments,
    courses: review.courses
      .filter((c) => c.isNew)
      .map((c) => ({ code: c.code, prefix: c.prefix, type: c.detectedType })),
    faculty: review.faculty
      .filter((f) => f.isNew)
      .map((f) => ({ initial: f.initial, department: f.department })),
    batches: review.newItems.batches,
    sections: review.newItems.sections,
    lab_groups: review.newItems.labGroups,
    buildings: review.newItems.buildings,
    rooms: review.newItems.rooms,
    classes: classes.map((c) => ({
      batch: c.batch,
      section: c.section,
      lab_group: c.labGroup,
      course: c.courseCode,
      section_label: c.sectionLabel,
      initial: c.facultyInitial,
      department: (c.facultyDept ?? home)?.toUpperCase() ?? null,
      building: c.building,
      room: c.room,
      day: c.day,
      position: c.slot,
      span: c.span,
      raw: c.raw,
    })),
  };
}
