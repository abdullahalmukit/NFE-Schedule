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
