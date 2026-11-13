/**
 * Department routine (.docx) -> structured class records.
 *
 * Layout (Fall 2026, verified on Version 5):
 *   row 0: [ "263-A", "8:20-09:50", "09:50-11:20", ... 6 slots ]
 *   rows 1..7: [ "Saturday" .. "Friday", cell, cell, ... ]
 *   class cell: 3 lines -> "0531-1104-A1" / "DAMR" / "AB-1: 206"
 *
 * The parser never throws on bad content; it reports issues so the admin
 * can fix them on the review screen. It only throws if the file is not a
 * Word document at all.
 */
import { extractDocxTables, type DocxTable } from "../docx/tables";
import { detectClashes } from "./clashes";
import {
  DEFAULT_ROUTINE_RULES,
  type ParseIssue,
  type ParsedClass,
  type ParsedRoutine,
  type RoutineParserRules,
  type TimeSlot,
} from "./rules";

const pad = (n: number) => String(n).padStart(2, "0");

function toTime(h: number, m: number, pmBefore: number): string {
  const hh = h < pmBefore ? h + 12 : h;
  return `${pad(hh)}:${pad(m)}`;
}

function dayIndex(name: string, rules: RoutineParserRules): number | null {
  const n = name.trim().toLowerCase();
  if (n.length < 3) return null;
  for (const [full, idx] of Object.entries(rules.days)) {
    if (full.startsWith(n) || n.startsWith(full)) return idx;
  }
  return null;
}

export function parseRoutineDocx(
  file: Uint8Array,
  rules: RoutineParserRules = DEFAULT_ROUTINE_RULES,
): ParsedRoutine {
  return parseRoutineTables(extractDocxTables(file), rules);
}

export function parseRoutineTables(
  docTables: DocxTable[],
  rules: RoutineParserRules = DEFAULT_ROUTINE_RULES,
): ParsedRoutine {
  const reTitle = new RegExp(rules.tableTitle);
  const reCourse = new RegExp(rules.courseLine);
  const reFaculty = new RegExp(rules.facultyLine);
  const reRoom = new RegExp(rules.roomLine);
  const reTime = new RegExp(rules.timeHeader);

  const issues: ParseIssue[] = [];
  const classes: ParsedClass[] = [];
  const tables: ParsedRoutine["tables"] = [];
  let timeSlots: TimeSlot[] = [];
  const seenTitles = new Set<string>();

  for (const t of docTables) {
    if (t.rows.length < 2) continue;
    const header = t.rows[0];
    const titleText = header[0]?.lines.join(" ") ?? "";
    const tm = reTitle.exec(titleText);
    if (!tm?.groups) {
      issues.push({ severity: "error", code: "BAD_TITLE", message: `Table ${t.index + 1}: title "${titleText}" is not batch-section`, raw: [titleText] });
      continue;
    }
    const batch = tm.groups.batch;
    const section = tm.groups.section;
    const title = `${batch}-${section}`;
    if (seenTitles.has(title)) {
      issues.push({ severity: "error", code: "DUPLICATE_TABLE", message: `Table ${title} appears more than once`, table: title });
      continue;
    }
    seenTitles.add(title);
    tables.push({ batch, section, index: t.index });

    // Header -> time slots (taken from the first table, checked on the rest).
    const slots: TimeSlot[] = [];
    let pos = 1;
    for (const h of header.slice(1)) {
      const label = h.lines.join(" ");
      const m = reTime.exec(label);
      if (!m?.groups) {
        issues.push({ severity: "error", code: "BAD_HEADER", message: `${title}: header "${label}" is not a time range`, table: title });
      } else {
        const g = m.groups;
        slots.push({
          position: pos,
          start: toTime(+g.sh, +g.sm, rules.pmBeforeHour),
          end: toTime(+g.eh, +g.em, rules.pmBeforeHour),
          label,
        });
      }
      pos += h.span;
    }
    if (timeSlots.length === 0) timeSlots = slots;
    else if (JSON.stringify(slots.map((s) => [s.start, s.end])) !== JSON.stringify(timeSlots.map((s) => [s.start, s.end]))) {
      issues.push({ severity: "warning", code: "BAD_HEADER", message: `${title}: time slots differ from the first table`, table: title });
    }

    for (const row of t.rows.slice(1)) {
      const dayText = row[0]?.lines.join(" ") ?? "";
      const day = dayIndex(dayText, rules);
      if (day === null) {
        if (row.slice(1).some((c) => c.lines.length)) {
          issues.push({ severity: "error", code: "BAD_DAY", message: `${title}: row "${dayText}" is not a day`, table: title });
        }
        continue;
      }
      let slot = 1;
      for (const cell of row.slice(1)) {
        const here = slot;
        slot += cell.span;
        if (cell.vMergeContinue) {
          issues.push({ severity: "warning", code: "MERGED_CELL", message: `${title}: vertically merged cell`, table: title, day, slot: here });
          continue;
        }
        if (cell.lines.length === 0) continue;

        const raw = cell.lines;
        const at = { table: title, day, slot: here, raw };
        if (cell.span > 1) {
          issues.push({ severity: "info", code: "MERGED_CELL", message: `${title}: class spans ${cell.span} slots`, ...at });
        }
        if (raw.length !== rules.lineOrder.length) {
          issues.push({ severity: "error", code: "BAD_CELL_LINES", message: `${title}: cell has ${raw.length} lines, expected ${rules.lineOrder.length}`, ...at });
          continue;
        }
        const line = (k: "course" | "faculty" | "room") => raw[rules.lineOrder.indexOf(k)];
        const mc = reCourse.exec(line("course"));
        const mf = reFaculty.exec(line("faculty"));
        const mr = reRoom.exec(line("room"));
        if (!mc?.groups) issues.push({ severity: "error", code: "BAD_COURSE_LINE", message: `${title}: course "${line("course")}" not recognised`, ...at });
        if (!mf?.groups) issues.push({ severity: "error", code: "BAD_FACULTY_LINE", message: `${title}: faculty "${line("faculty")}" not recognised`, ...at });
        if (!mr?.groups) issues.push({ severity: "error", code: "BAD_ROOM_LINE", message: `${title}: room "${line("room")}" not recognised`, ...at });
        if (!mc?.groups || !mf?.groups || !mr?.groups) continue;

        const prefix = mc.groups.prefix ?? null;
        const label = mc.groups.label;
        const cls: ParsedClass = {
          batch,
          section,
          day,
          slot: here,
          span: cell.span,
          coursePrefix: prefix,
          courseCode: prefix ? `${prefix} ${mc.groups.code}` : mc.groups.code,
          sectionLabel: label,
          labGroup: mc.groups.group ? `${label}${mc.groups.group}` : null,
          facultyInitial: mf.groups.initial,
          facultyDept: mf.groups.dept ?? null,
          building: mr.groups.building,
          room: mr.groups.room,
          raw,
        };
        if (label !== section) {
          issues.push({
            severity: "warning",
            code: "CROSS_SECTION_LABEL",
            message: `${title}: "${raw[0]}" carries section label ${label}, not ${section}`,
            ...at,
          });
        }
        classes.push(cls);
      }
    }
  }

  const clashes = detectClashes(classes);
  for (const c of clashes) {
    issues.push({
      severity: "error",
      code: c.kind === "teacher" ? "TEACHER_CLASH" : c.kind === "room" ? "ROOM_CLASH" : "SECTION_CLASH",
      message: `${c.kind} clash: ${c.key} has ${c.items.length} classes at the same time`,
      day: c.day,
      slot: c.slot,
      raw: c.items.map((i) => `${i.batch}-${i.section} ${i.raw[0]}`),
    });
  }

  const batches: ParsedRoutine["stats"]["batches"] = {};
  const sectionsByBatch = new Map<string, Set<string>>();
  const groupsBySection = new Map<string, Set<string>>();
  for (const t of tables) {
    (sectionsByBatch.get(t.batch) ?? sectionsByBatch.set(t.batch, new Set()).get(t.batch)!).add(t.section);
  }
  for (const c of classes) {
    if (!c.labGroup) continue;
    const k = `${c.batch}-${c.section}`;
    (groupsBySection.get(k) ?? groupsBySection.set(k, new Set()).get(k)!).add(c.labGroup);
  }
  for (const [b, secs] of sectionsByBatch) {
    let groups = 0;
    for (const s of secs) groups += groupsBySection.get(`${b}-${s}`)?.size ?? 0;
    batches[b] = { sections: secs.size, labGroups: groups };
  }

  return {
    timeSlots,
    tables,
    classes,
    issues,
    stats: {
      tables: tables.length,
      classes: classes.length,
      labSessions: classes.filter((c) => c.labGroup).length,
      courseCodes: new Set(classes.map((c) => c.courseCode)).size,
      facultyInitials: new Set(classes.map((c) => `${c.facultyInitial}(${c.facultyDept ?? ""})`)).size,
      rooms: new Set(classes.map((c) => `${c.building}:${c.room}`)).size,
      batches,
      teacherClashes: clashes.filter((c) => c.kind === "teacher").length,
      roomClashes: clashes.filter((c) => c.kind === "room").length,
      errors: issues.filter((i) => i.severity === "error").length,
      warnings: issues.filter((i) => i.severity === "warning").length,
    },
  };
}
