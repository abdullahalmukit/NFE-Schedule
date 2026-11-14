/**
 * Faculty and course import (ADM-MD-1, ADM-MD-2; docs/MASTER_DATA_IMPORT.md):
 * header synonyms, column matching, row validation and the preview that
 * compares every row with the database. Pure functions; the readers in
 * `@nfe/parser` turn files into an `ImportTable`, the web routes load the
 * existing rows and send the apply plan to `apply_master_import`.
 */
import { z } from "zod";
import {
  normalizeCourseCode,
  normalizeEmail,
  normalizePhone,
  splitInitial,
  toLatinDigits,
} from "./normalize";

export type MasterKind = "faculty" | "courses";

export const MASTER_KINDS: readonly MasterKind[] = ["faculty", "courses"];

export function isMasterKind(value: unknown): value is MasterKind {
  return value === "faculty" || value === "courses";
}

/** What every reader returns: one header row and the data rows as text. */
export interface ImportTable {
  headers: string[];
  rows: string[][];
}

export type FacultyField =
  | "initial"
  | "full_name"
  | "designation"
  | "department"
  | "email"
  | "phone"
  | "office_room"
  | "consultation_hours"
  | "status"
  | "is_guest";

export type CourseField = "code" | "title" | "title_bn" | "credit" | "type" | "offering_department";

export type MasterField = FacultyField | CourseField;

export interface FieldDef {
  field: MasterField;
  required: boolean;
  /** Header texts that match this field (the field name itself always matches). */
  synonyms: readonly string[];
}

export const MASTER_FIELDS: Record<MasterKind, readonly FieldDef[]> = {
  faculty: [
    {
      field: "initial",
      required: true,
      synonyms: [
        "initial",
        "short name",
        "short form",
        "code",
        "teacher code",
        "abbreviation",
        "সংক্ষিপ্ত নাম",
      ],
    },
    {
      field: "full_name",
      required: false,
      synonyms: ["name", "full name", "teacher name", "faculty name", "নাম"],
    },
    {
      field: "designation",
      required: false,
      synonyms: ["designation", "position", "rank", "title", "পদবি"],
    },
    { field: "department", required: false, synonyms: ["department", "dept", "বিভাগ"] },
    { field: "email", required: false, synonyms: ["email", "e-mail", "mail", "ইমেইল"] },
    {
      field: "phone",
      required: false,
      synonyms: ["phone", "mobile", "contact", "cell", "ফোন", "মোবাইল"],
    },
    {
      field: "office_room",
      required: false,
      synonyms: ["office", "room", "office room", "chamber"],
    },
    {
      field: "consultation_hours",
      required: false,
      synonyms: ["consultation", "consultation hours", "counselling hours", "office hours"],
    },
    { field: "status", required: false, synonyms: ["status"] },
    { field: "is_guest", required: false, synonyms: ["guest", "external"] },
  ],
  courses: [
    {
      field: "code",
      required: true,
      synonyms: ["code", "course code", "course no", "course number", "কোড"],
    },
    {
      field: "title",
      required: false,
      synonyms: ["title", "course title", "course name", "name", "শিরোনাম"],
    },
    { field: "title_bn", required: false, synonyms: ["bangla title", "title (bn)", "title bn"] },
    {
      field: "credit",
      required: false,
      synonyms: ["credit", "credits", "cr", "ch", "credit hour"],
    },
    { field: "type", required: false, synonyms: ["type", "theory/lab", "category"] },
    {
      field: "offering_department",
      required: false,
      synonyms: ["department", "offered by", "dept"],
    },
  ],
};

/** Columns of the downloaded templates that are only for reading; never imported. */
export const INFO_COLUMNS = ["classes_per_week", "detected_type", "sessions_per_week"] as const;

/** Lower case, no spaces / dots / underscores / dashes / brackets / slashes: "E-mail" → "email". */
export function headerKey(text: string): string {
  return text
    .normalize("NFC")
    .toLowerCase()
    .replace(/[\s._\-()[\]/:\\]+/g, "");
}

const synonymKeys = (def: FieldDef) => new Set([def.field, ...def.synonyms].map(headerKey));

/** field → header text. A field without a header is not imported. */
export type ColumnMapping = Partial<Record<MasterField, string>>;

/** Picks a header for every field from the synonyms; each header is used once. */
export function autoMatch(kind: MasterKind, headers: readonly string[]): ColumnMapping {
  const used = new Set<number>();
  const mapping: ColumnMapping = {};
  for (const def of MASTER_FIELDS[kind]) {
    const keys = synonymKeys(def);
    const i = headers.findIndex((h, idx) => !used.has(idx) && keys.has(headerKey(h)));
    if (i >= 0) {
      used.add(i);
      mapping[def.field] = headers[i];
    }
  }
  return mapping;
}

/** How many fields a header row matches; readers use it to find the right table / row. */
export function headerScore(kind: MasterKind, headers: readonly string[]): number {
  return Object.keys(autoMatch(kind, headers)).length;
}

/** A saved preset, keeping only the headers this file has. */
export function presetMapping(
  kind: MasterKind,
  headers: readonly string[],
  preset: unknown,
): ColumnMapping {
  const parsed = mappingSchema.safeParse(preset);
  if (!parsed.success) return {};
  const fields = new Set(MASTER_FIELDS[kind].map((d) => d.field));
  const mapping: ColumnMapping = {};
  for (const [field, header] of Object.entries(parsed.data)) {
    if (fields.has(field as MasterField) && header && headers.includes(header)) {
      mapping[field as MasterField] = header;
    }
  }
  return mapping;
}

export const mappingSchema = z.record(z.string(), z.string().max(200));

export const importOptionsSchema = z.object({
  /** Empty cells clear the stored value (off: empty cells never overwrite). */
  clearEmpty: z.boolean().default(false),
  /** Apply the valid rows and leave the invalid ones out. */
  skipInvalid: z.boolean().default(true),
});
export type ImportOptions = z.infer<typeof importOptionsSchema>;

export function missingRequired(kind: MasterKind, mapping: ColumnMapping): MasterField[] {
  return MASTER_FIELDS[kind].filter((d) => d.required && !mapping[d.field]).map((d) => d.field);
}

// ------------------------------------------------------------------ existing rows

export interface ExistingFaculty {
  id: string;
  initial: string;
  /** Department code; null = no department (treated as the home department). */
  department: string | null;
  full_name: string | null;
  designation: string | null;
  email: string | null;
  phone: string | null;
  office_room: string | null;
  consultation_hours: string | null;
  status: "active" | "on_leave" | "left";
  is_guest: boolean;
}

export interface ExistingCourse {
  id: string;
  code: string;
  title: string | null;
  title_bn: string | null;
  credit: number | null;
  type: "theory" | "lab" | "other";
  offering_department: string | null;
}

export interface ExistingData {
  /** Active (not left, not deleted) faculty; the unique initial index covers only these. */
  faculty?: readonly ExistingFaculty[];
  /** Courses that are not deleted (archived ones included: the code is unique). */
  courses?: readonly ExistingCourse[];
  /** Codes of departments that exist. */
  departments: readonly string[];
  /** Code of the home department (NFE); faculty without a department belong to it. */
  homeDepartment: string | null;
}

// ------------------------------------------------------------------ preview

export type Value = string | number | boolean | null;

export type ReasonCode =
  | "missingKey"
  | "badInitial"
  | "badCode"
  | "badDepartment"
  | "unknownDepartment"
  | "badEmail"
  | "badPhone"
  | "badCredit"
  | "badType"
  | "badStatus"
  | "badGuest"
  | "tooLong"
  | "duplicateInFile";

export interface Reason {
  code: ReasonCode;
  field?: MasterField;
  value?: string;
}

export interface ImportChange {
  field: MasterField;
  from: Value;
  to: Value;
}

export type RowStatus = "new" | "update" | "unchanged" | "invalid";

export interface PreviewRow {
  /** Row number in the file's table (1 = first data row). */
  line: number;
  /** Initial (with department) or course code, as stored. */
  key: string;
  status: RowStatus;
  reasons: Reason[];
  /** Section letter removed from a course code. */
  removedSection: string | null;
  /** Existing record that is updated. */
  id: string | null;
  /** New: every value to insert. Update: only the changed values. */
  values: Partial<Record<MasterField, Value>>;
  changes: ImportChange[];
}

export interface Preview {
  rows: PreviewRow[];
  counts: Record<RowStatus, number>;
  /** Department codes that do not exist yet and will be created on apply (faculty only). */
  newDepartments: string[];
}

const NOT_CLEARABLE = new Set<MasterField>(["type", "status", "is_guest"]);
const MAX_TEXT = 300;

type Parsed = { ok: true; value: Value } | { ok: false; reason: Reason };

const text = (raw: string): Parsed => {
  const v = raw.replace(/\s+/g, " ").trim();
  return v.length > MAX_TEXT
    ? { ok: false, reason: { code: "tooLong", value: v.slice(0, 40) } }
    : { ok: true, value: v };
};

const TYPE_WORDS: Record<string, "theory" | "lab" | "other"> = {
  theory: "theory",
  lecture: "theory",
  lab: "lab",
  laboratory: "lab",
  sessional: "lab",
  practical: "lab",
  other: "other",
  থিওরি: "theory",
  ল্যাব: "lab",
};

const STATUS_WORDS: Record<string, "active" | "on_leave" | "left"> = {
  active: "active",
  onleave: "on_leave",
  leave: "on_leave",
  left: "left",
  সক্রিয়: "active",
  ছুটিতে: "on_leave",
};

const YES = new Set(["yes", "y", "true", "1", "guest", "external", "হ্যাঁ"]);
const NO = new Set(["no", "n", "false", "0", "regular", "internal", "না"]);

const email = z.string().email();

/** Cell text → stored value for one field (cell is not empty). */
function parseField(field: MasterField, raw: string): Parsed {
  const bad = (code: ReasonCode): Parsed => ({
    ok: false,
    reason: { code, field, value: raw.trim().slice(0, 40) },
  });
  switch (field) {
    case "department":
    case "offering_department": {
      const v = raw.trim().toUpperCase().replace(/\s+/g, "");
      return /^[A-Z]{2,8}$/.test(v) ? { ok: true, value: v } : bad("badDepartment");
    }
    case "email": {
      const v = normalizeEmail(raw);
      return email.safeParse(v).success ? { ok: true, value: v } : bad("badEmail");
    }
    case "phone": {
      const v = normalizePhone(raw);
      return /^\+?\d{6,15}$/.test(v) ? { ok: true, value: v } : bad("badPhone");
    }
    case "status": {
      const v = STATUS_WORDS[headerKey(raw)];
      return v ? { ok: true, value: v } : bad("badStatus");
    }
    case "is_guest": {
      const k = headerKey(raw);
      return YES.has(k)
        ? { ok: true, value: true }
        : NO.has(k)
          ? { ok: true, value: false }
          : bad("badGuest");
    }
    case "credit": {
      const v = toLatinDigits(raw).trim();
      const n = Number(v);
      // numeric(3,1): up to 20, one decimal ("3", "1.5", "3.00").
      return /^\d+(\.\d+)?$/.test(v) && n <= 20 && Math.abs(n * 10 - Math.round(n * 10)) < 1e-9
        ? { ok: true, value: n }
        : bad("badCredit");
    }
    case "type": {
      const v = TYPE_WORDS[headerKey(raw)];
      return v ? { ok: true, value: v } : bad("badType");
    }
    default:
      return text(raw);
  }
}

function isEmpty(cell: string | undefined): boolean {
  return cell === undefined || cell.trim() === "" || cell.trim() === "-" || cell.trim() === "—";
}

const same = (a: Value, b: Value) =>
  typeof a === "string" && typeof b === "string" ? a === b : a === b;

/**
 * Checks every row and compares it with the database: new, update (with the
 * old → new values), unchanged or invalid (with reasons). Fully empty rows are
 * left out. Only mapped columns are looked at; empty cells never overwrite
 * unless `clearEmpty` is on.
 */
export function buildPreview(input: {
  kind: MasterKind;
  table: ImportTable;
  mapping: ColumnMapping;
  options: ImportOptions;
  existing: ExistingData;
}): Preview {
  const { kind, table, mapping, options, existing } = input;
  const keyField: MasterField = kind === "faculty" ? "initial" : "code";
  const col = new Map<MasterField, number>();
  for (const def of MASTER_FIELDS[kind]) {
    const header = mapping[def.field];
    const i = header === undefined ? -1 : table.headers.indexOf(header);
    if (i >= 0) col.set(def.field, i);
  }
  const home = existing.homeDepartment?.toUpperCase() ?? null;
  const knownDepartments = new Set(existing.departments.map((d) => d.toUpperCase()));
  const newDepartments = new Set<string>();
  const facultyByKey = new Map(
    (existing.faculty ?? []).map((f) => [
      `${f.initial.toUpperCase()}|${(f.department ?? home ?? "").toUpperCase()}`,
      f,
    ]),
  );
  const courseByCode = new Map((existing.courses ?? []).map((c) => [c.code.toUpperCase(), c]));
  const seen = new Set<string>();
  const rows: PreviewRow[] = [];

  table.rows.forEach((cells, index) => {
    if (cells.every((c) => isEmpty(c))) return;
    const reasons: Reason[] = [];
    const parsed: Partial<Record<MasterField, Value>> = {};
    const empty = new Set<MasterField>();
    let removedSection: string | null = null;
    let key = "";

    // Key field.
    const rawKey = cells[col.get(keyField) ?? -1];
    let keyDepartment: string | null = null;
    if (isEmpty(rawKey)) {
      reasons.push({ code: "missingKey", field: keyField });
    } else if (kind === "faculty") {
      const { initial, department } = splitInitial(rawKey!);
      if (/^[A-Z]{1,8}$/.test(initial)) {
        parsed.initial = initial;
        keyDepartment = department;
      } else {
        reasons.push({ code: "badInitial", field: "initial", value: rawKey!.trim().slice(0, 40) });
      }
    } else {
      const n = normalizeCourseCode(rawKey!);
      if (n) {
        parsed.code = n.code;
        removedSection = n.removedSection;
      } else {
        reasons.push({ code: "badCode", field: "code", value: rawKey!.trim().slice(0, 40) });
      }
    }

    // Other fields.
    for (const [field, i] of col) {
      if (field === keyField) continue;
      const cell = cells[i];
      if (isEmpty(cell)) {
        empty.add(field);
        continue;
      }
      const r = parseField(field, cell!);
      if (r.ok) parsed[field] = r.value;
      else reasons.push(r.reason);
    }

    // Department: the column, else "NI(ITM)", else the home department.
    if (kind === "faculty") {
      const dept = (parsed.department as string | undefined) ?? keyDepartment ?? home ?? null;
      parsed.department = dept;
      empty.delete("department");
      if (dept && !knownDepartments.has(dept) && !reasons.some((r) => r.field === "department")) {
        newDepartments.add(dept);
      }
      if (parsed.initial)
        key = dept && dept !== home ? `${parsed.initial}(${dept})` : `${parsed.initial}`;
    } else {
      const dept = parsed.offering_department;
      if (typeof dept === "string" && !knownDepartments.has(dept)) {
        reasons.push({ code: "unknownDepartment", field: "offering_department", value: dept });
      }
      if (parsed.code) key = parsed.code as string;
    }

    const dedupe = kind === "faculty" ? `${parsed.initial}|${parsed.department ?? ""}` : key;
    if (key && seen.has(dedupe))
      reasons.push({ code: "duplicateInFile", field: keyField, value: key });
    if (key) seen.add(dedupe);

    const base = { line: index + 1, key, removedSection, reasons };
    if (reasons.length) {
      rows.push({ ...base, status: "invalid", id: null, values: {}, changes: [] });
      return;
    }

    const current: Partial<Record<MasterField, Value>> | undefined =
      kind === "faculty"
        ? facultyByKey.get(`${parsed.initial}|${parsed.department ?? ""}`)
        : courseByCode.get(String(parsed.code));
    if (!current) {
      rows.push({ ...base, status: "new", id: null, values: parsed, changes: [] });
      return;
    }

    const changes: ImportChange[] = [];
    for (const field of col.keys()) {
      if (field === keyField || field === "department") continue;
      const from = current[field] ?? null;
      let to: Value;
      if (empty.has(field)) {
        if (!options.clearEmpty || NOT_CLEARABLE.has(field)) continue;
        to = null;
      } else {
        to = parsed[field] ?? null;
      }
      if (!same(from, to)) changes.push({ field, from, to });
    }
    rows.push({
      ...base,
      status: changes.length ? "update" : "unchanged",
      id: (current as { id: string }).id,
      values: Object.fromEntries(changes.map((c) => [c.field, c.to])),
      changes,
    });
  });

  const counts: Record<RowStatus, number> = { new: 0, update: 0, unchanged: 0, invalid: 0 };
  for (const r of rows) counts[r.status] += 1;
  return {
    rows,
    counts,
    newDepartments: [...newDepartments].filter((d) =>
      rows.some((r) => r.status === "new" && r.values.department === d),
    ),
  };
}

/** What `apply_master_import` receives: new rows (no id) and updates (only changed values). */
export interface ApplyPlan {
  departments: string[];
  rows: { id: string | null; values: Partial<Record<MasterField, Value>> }[];
}

/** Null when nothing can be applied: invalid rows while "skip invalid" is off. */
export function applyPlan(preview: Preview, options: ImportOptions): ApplyPlan | null {
  if (!options.skipInvalid && preview.counts.invalid > 0) return null;
  return {
    departments: preview.newDepartments,
    rows: preview.rows
      .filter((r) => r.status === "new" || r.status === "update")
      .map((r) => ({ id: r.id, values: r.values })),
  };
}

// ------------------------------------------------------------------ CSV and templates

function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** RFC 4180 CSV with CRLF line ends (Excel opens it; add a BOM when saving for Bangla). */
export function toCsv(headers: readonly string[], rows: readonly (readonly string[])[]): string {
  return [headers, ...rows].map((r) => r.map((c) => csvCell(c ?? "")).join(",")).join("\r\n");
}

/** The invalid rows with their original cells plus an "error" column, to fix and upload again. */
export function invalidRowsCsv(
  table: ImportTable,
  preview: Preview,
  describe: (reason: Reason) => string,
): string {
  const rows = preview.rows
    .filter((r) => r.status === "invalid")
    .map((r) => [
      ...table.headers.map((_, i) => table.rows[r.line - 1]?.[i] ?? ""),
      r.reasons.map(describe).join("; "),
    ]);
  return toCsv([...table.headers, "error"], rows);
}

export const TEMPLATE_HEADERS: Record<MasterKind, readonly string[]> = {
  faculty: [
    "initial",
    "department",
    "classes_per_week",
    "full_name",
    "designation",
    "email",
    "phone",
    "office_room",
    "consultation_hours",
    "status",
    "is_guest",
  ],
  courses: [
    "code",
    "detected_type",
    "sessions_per_week",
    "title",
    "title_bn",
    "credit",
    "type",
    "offering_department",
  ],
};

export interface TemplateFaculty extends Omit<ExistingFaculty, "id"> {
  classes_per_week: number | null;
}
export interface TemplateCourse extends Omit<ExistingCourse, "id"> {
  detected_type: "theory" | "lab" | null;
  sessions_per_week: number | null;
}

/** Template rows (ADM-MD-3): every initial / code with what is already stored filled in. */
export function templateTable(
  kind: MasterKind,
  records: readonly (TemplateFaculty | TemplateCourse)[],
): ImportTable {
  const headers = [...TEMPLATE_HEADERS[kind]];
  const cell = (v: unknown) =>
    v === null || v === undefined ? "" : typeof v === "boolean" ? (v ? "yes" : "no") : String(v);
  return {
    headers,
    rows: records.map((r) =>
      headers.map((h) => cell((r as unknown as Record<string, unknown>)[h])),
    ),
  };
}

/** The same table as a JSON array of objects (empty cells left out). */
export function tableToJson(table: ImportTable): Record<string, string>[] {
  return table.rows.map((r) =>
    Object.fromEntries(
      table.headers.flatMap((h, i) => (r[i] ? [[h, r[i]] as [string, string]] : [])),
    ),
  );
}

/** Largest file the import accepts (bytes). */
export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

/**
 * Path of an uploaded file in the private `imports` bucket: "<runId>/<name>".
 * Storage keys are kept ASCII ("শিক্ষক তালিকা.xlsx" → "file.xlsx"); the original
 * name is stored in `import_runs.file_name`.
 */
export function importObjectPath(runId: string, fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  const ext =
    dot > 0
      ? fileName
          .slice(dot + 1)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")
      : "";
  const base = (dot > 0 ? fileName.slice(0, dot) : fileName)
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${runId}/${base || "file"}${ext ? `.${ext}` : ""}`;
}
