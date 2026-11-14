/** Bookkeeping columns that change on every write and say nothing to a reader. */
const IGNORED = new Set(["updated_at", "sync_version"]);

export interface FieldChange {
  field: string;
  before: unknown;
  after: unknown;
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Fields that differ between an audit row's before and after (A-18).
 * Insert: every field of `after`; delete: every field of `before`.
 */
export function changedFields(before: unknown, after: unknown): FieldChange[] {
  const b = before && typeof before === "object" ? (before as Record<string, unknown>) : {};
  const a = after && typeof after === "object" ? (after as Record<string, unknown>) : {};
  const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])].sort();
  return keys
    .filter((k) => !IGNORED.has(k) && !same(b[k], a[k]))
    .map((k) => ({ field: k, before: b[k] ?? null, after: a[k] ?? null }));
}

/** Short text for a value in the diff table. */
export function showValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

/** Tables with the audit trigger (supabase/migrations/..._security.sql), for the A-18 filter. */
export const AUDITED_TABLES = [
  "academic_events",
  "admin_invites",
  "admin_permissions",
  "app_releases",
  "app_settings",
  "batches",
  "buildings",
  "calendar_days",
  "class_exceptions",
  "class_slots",
  "courses",
  "cr_assignments",
  "cr_requests",
  "departments",
  "faculty",
  "feature_flags",
  "issue_reports",
  "lab_groups",
  "notices",
  "rooms",
  "routine_versions",
  "sections",
  "semesters",
  "time_slots",
] as const;
