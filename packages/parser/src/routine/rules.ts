/**
 * Parser rules are data, not code: the admin can edit them in
 * Admin > Settings > Routine format (stored in app_settings key
 * "parser.routine"). These defaults match the Fall 2026 routine file.
 * All patterns use named groups; the parser only reads the group names.
 */
export interface RoutineParserRules {
  /** Top-left cell of each table. Groups: batch, section */
  tableTitle: string;
  /** Line 1. Groups: prefix (optional), code, label, group (optional digit) */
  courseLine: string;
  /** Line 2. Groups: initial, dept (optional) */
  facultyLine: string;
  /** Line 3. Groups: building, room */
  roomLine: string;
  /** Header time cell, e.g. "8:20-09:50". Groups: sh, sm, eh, em */
  timeHeader: string;
  /** Hours below this value in a header are afternoon (01:10 -> 13:10). */
  pmBeforeHour: number;
  /** Day name (lower-case, any prefix length >= 3 accepted) -> day index. */
  days: Record<string, number>;
  /** Which line holds what, in case the department reorders them. */
  lineOrder: Array<"course" | "faculty" | "room">;
}

export const DEFAULT_ROUTINE_RULES: RoutineParserRules = {
  tableTitle: String.raw`^(?<batch>\d{3})\s*-\s*(?<section>[A-Z])$`,
  courseLine: String.raw`^(?:(?<prefix>[A-Z]{2,5})\s+)?(?<code>\d{4}-\d{3,4})-(?<label>[A-Z])(?<group>\d)?$`,
  facultyLine: String.raw`^(?<initial>[A-Z]{1,6})(?:\s*\((?<dept>[A-Z]{2,6})\))?$`,
  roomLine: String.raw`^(?<building>[A-Za-z][A-Za-z0-9-]*)\s*:\s*(?<room>[A-Za-z0-9-]+)$`,
  timeHeader: String.raw`^(?<sh>\d{1,2}):(?<sm>\d{2})\s*[-–]\s*(?<eh>\d{1,2}):(?<em>\d{2})$`,
  pmBeforeHour: 8,
  // 0 = Saturday ... 6 = Friday (DIU week starts on Saturday)
  days: { saturday: 0, sunday: 1, monday: 2, tuesday: 3, wednesday: 4, thursday: 5, friday: 6 },
  lineOrder: ["course", "faculty", "room"],
};

export type Severity = "error" | "warning" | "info";

export interface ParseIssue {
  severity: Severity;
  code:
    | "BAD_TITLE"
    | "BAD_HEADER"
    | "BAD_DAY"
    | "BAD_CELL_LINES"
    | "BAD_COURSE_LINE"
    | "BAD_FACULTY_LINE"
    | "BAD_ROOM_LINE"
    | "MERGED_CELL"
    | "DUPLICATE_TABLE"
    | "CROSS_SECTION_LABEL"
    | "TEACHER_CLASH"
    | "ROOM_CLASH"
    | "SECTION_CLASH";
  message: string;
  table?: string;
  day?: number;
  slot?: number;
  raw?: string[];
}

export interface TimeSlot {
  position: number; // 1-based column
  start: string; // "08:20" (24h)
  end: string; // "09:50"
  label: string; // as written in the file
}

export interface ParsedClass {
  batch: string;
  section: string;
  day: number;
  slot: number; // 1-based, matches TimeSlot.position
  span: number; // >1 if the cell is merged across slots
  coursePrefix: string | null;
  courseCode: string; // "0531-1104" or "AOL 0223-111"
  sectionLabel: string; // letter after the code ("A")
  labGroup: string | null; // "A1" for lab cells, else null
  facultyInitial: string;
  facultyDept: string | null; // "ITM" for "NI(ITM)"
  building: string;
  room: string;
  raw: string[];
}

export interface ParsedRoutine {
  timeSlots: TimeSlot[];
  tables: Array<{ batch: string; section: string; index: number }>;
  classes: ParsedClass[];
  issues: ParseIssue[];
  stats: {
    tables: number;
    classes: number;
    labSessions: number;
    courseCodes: number;
    facultyInitials: number;
    rooms: number;
    batches: Record<string, { sections: number; labGroups: number }>;
    teacherClashes: number;
    roomClashes: number;
    errors: number;
    warnings: number;
  };
}
