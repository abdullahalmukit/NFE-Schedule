import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  buildPreview,
  fill,
  hasArea,
  importOptionsSchema,
  mappingSchema,
  MASTER_FIELDS,
  missingRequired,
  type ColumnMapping,
  type ExistingData,
  type MasterField,
  type MasterKind,
  type MessageKey,
  type Preview,
  type Reason,
  type Value,
} from "@nfe/core";
import type { MasterTable } from "@nfe/parser/master";
import { readAdminAccess } from "./admin";
import { getAppState, type AppState } from "./app-state";
import { createClient } from "./supabase/server";

export type Supabase = Awaited<ReturnType<typeof createClient>>;

export interface ImportContext {
  supabase: Supabase;
  userId: string;
  tr: AppState["tr"];
}

/** JSON error with a message in the admin's language. */
export function fail(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export const kindSchema = z.enum(["faculty", "courses"]);

/**
 * The caller must be a signed-in, active admin with the area of this import
 * (faculty / courses). Returns a ready error response otherwise.
 */
export async function importContext(kind: MasterKind): Promise<ImportContext | NextResponse> {
  const state = await getAppState();
  const { tr } = state;
  if (!state.user || state.stage !== "ready") return fail(401, tr("imp.err.generic"));
  const access = await readAdminAccess(state.user.id);
  if (!hasArea(access, kind)) {
    return fail(403, fill(tr("md.noArea"), { area: tr(`admin.area.${kind}`) }));
  }
  return { supabase: await createClient(), userId: state.user.id, tr };
}

/** Body of preview / apply. */
export const previewBody = z.object({
  kind: kindSchema,
  runId: z.string().uuid(),
  mapping: mappingSchema,
  options: importOptionsSchema,
});

const storedSchema = z.object({
  table: z.object({
    headers: z.array(z.string()),
    rows: z.array(z.array(z.string())),
    source: z.object({ sheet: z.string().optional(), page: z.number().optional() }),
    sheets: z.array(z.string()).optional(),
  }),
});

export interface ParsedRun {
  id: string;
  status: string;
  table: MasterTable;
}

/** A parsed run of this kind that has not been applied yet, or an error response. */
export async function loadParsedRun(
  ctx: ImportContext,
  kind: MasterKind,
  runId: string,
): Promise<ParsedRun | NextResponse> {
  const { data } = await ctx.supabase
    .from("import_runs")
    .select("id, kind, status, result")
    .eq("id", runId)
    .maybeSingle();
  if (!data || data.kind !== kind) return fail(404, ctx.tr("imp.err.noRun"));
  if (data.status === "applied") return fail(409, ctx.tr("imp.err.applied"));
  const stored = storedSchema.safeParse(data.result);
  if (data.status !== "parsed" || !stored.success) return fail(404, ctx.tr("imp.err.noRun"));
  return { id: data.id, status: data.status, table: stored.data.table };
}

/** Records the preview is compared with (RLS: the admin's own area). */
export async function loadExisting(supabase: Supabase, kind: MasterKind): Promise<ExistingData> {
  const { data: departments } = await supabase
    .from("departments")
    .select("id, code, is_home")
    .is("deleted_at", null);
  const deptCode = new Map((departments ?? []).map((d) => [d.id, d.code]));
  const base: ExistingData = {
    departments: (departments ?? []).map((d) => d.code),
    homeDepartment: departments?.find((d) => d.is_home)?.code ?? null,
  };
  if (kind === "faculty") {
    const { data } = await supabase
      .from("faculty")
      .select(
        "id, initial, department_id, full_name, designation, email, phone, office_room, consultation_hours, status, is_guest",
      )
      .is("deleted_at", null)
      .neq("status", "left")
      .range(0, 9999);
    return {
      ...base,
      faculty: (data ?? []).map(({ department_id, ...f }) => ({
        ...f,
        department: department_id ? (deptCode.get(department_id) ?? null) : null,
      })),
    };
  }
  const { data } = await supabase
    .from("courses")
    .select("id, code, title, title_bn, credit, type, offering_department_id")
    .is("deleted_at", null)
    .range(0, 9999);
  return {
    ...base,
    courses: (data ?? []).map(({ offering_department_id, ...c }) => ({
      ...c,
      offering_department: offering_department_id
        ? (deptCode.get(offering_department_id) ?? null)
        : null,
    })),
  };
}

/** Required fields without a column, as a translated error; null when complete. */
export function requiredError(ctx: ImportContext, kind: MasterKind, mapping: ColumnMapping) {
  const missing = missingRequired(kind, mapping);
  if (!missing.length) return null;
  return fail(
    400,
    fill(ctx.tr("imp.err.required"), {
      fields: missing.map((f) => ctx.tr(`imp.field.${f}` as MessageKey)).join(", "),
    }),
  );
}

export async function previewFor(
  ctx: ImportContext,
  kind: MasterKind,
  run: ParsedRun,
  body: z.infer<typeof previewBody>,
): Promise<Preview> {
  return buildPreview({
    kind,
    table: run.table,
    mapping: body.mapping as ColumnMapping,
    options: body.options,
    existing: await loadExisting(ctx.supabase, kind),
  });
}

// ------------------------------------------------------------------ display

export function fieldLabel(tr: AppState["tr"], field: MasterField): string {
  return tr(`imp.field.${field}` as MessageKey);
}

export function describeReason(tr: AppState["tr"], r: Reason): string {
  return fill(tr(`imp.reason.${r.code}` as MessageKey), {
    field: r.field ? fieldLabel(tr, r.field) : "",
    value: r.value ?? "",
  });
}

function displayValue(tr: AppState["tr"], field: MasterField, value: Value | undefined): string {
  if (value === null || value === undefined || value === "") return tr("imp.preview.empty");
  if (typeof value === "boolean") return tr(value ? "imp.yes" : "imp.no");
  if (field === "status") return tr(`fac.status.${value}` as MessageKey);
  if (field === "type") return tr(`course.type.${value}` as MessageKey);
  return String(value);
}

export interface DisplayRow {
  line: number;
  key: string;
  status: Preview["rows"][number]["status"];
  notes: string[];
  changes: { label: string; from: string; to: string }[];
  values: { label: string; text: string }[];
}

/** The preview as text for the wizard (everything translated on the server). */
export function displayPreview(tr: AppState["tr"], kind: MasterKind, preview: Preview) {
  const keyField = kind === "faculty" ? "initial" : "code";
  const order = MASTER_FIELDS[kind].map((d) => d.field);
  const rows: DisplayRow[] = preview.rows.map((r) => ({
    line: r.line,
    key: r.key,
    status: r.status,
    notes: [
      ...r.reasons.map((reason) => describeReason(tr, reason)),
      ...(r.removedSection
        ? [fill(tr("imp.preview.sectionRemoved"), { s: r.removedSection })]
        : []),
    ],
    changes: r.changes.map((c) => ({
      label: fieldLabel(tr, c.field),
      from: displayValue(tr, c.field, c.from),
      to: displayValue(tr, c.field, c.to),
    })),
    values:
      r.status === "new"
        ? order
            .filter((f) => f !== keyField && r.values[f] !== undefined && r.values[f] !== null)
            .map((f) => ({ label: fieldLabel(tr, f), text: displayValue(tr, f, r.values[f]) }))
        : [],
  }));
  return { counts: preview.counts, newDepartments: preview.newDepartments, rows };
}
