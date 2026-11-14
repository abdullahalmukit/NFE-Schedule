import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  applyPlan,
  autoMatch,
  buildPreview,
  importObjectPath,
  type ImportTable,
  type Json,
} from "@nfe/core";
import { describeReason, fail, importContext, loadExisting } from "@/lib/master-import";

const text = z.string().trim().max(300);
const body = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("faculty"),
    runId: z.string().uuid(),
    rows: z
      .array(
        z.object({
          initial: text,
          department: text,
          full_name: text,
          designation: text,
        }),
      )
      .max(500),
  }),
  z.object({
    kind: z.literal("courses"),
    runId: z.string().uuid(),
    rows: z.array(z.object({ code: text, title: text, credit: text, type: text })).max(500),
  }),
]);

/**
 * "Faculty initials without details" / "Course codes without titles" on the
 * review screen (ADM-RT-2). Details are permanent reference data, so they are
 * saved to master data at once, through the same checks and SQL function as
 * the faculty / course file import (needs the faculty / courses area).
 */
export async function POST(request: Request) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { kind, runId } = parsed.data;
  const ctx = await importContext(kind);
  if (ctx instanceof NextResponse) return ctx;

  const headers =
    kind === "faculty"
      ? ["initial", "department", "full_name", "designation"]
      : ["code", "title", "credit", "type"];
  const rows = (parsed.data.rows as Record<string, string>[])
    .map((r) => headers.map((h) => r[h] ?? ""))
    // Only rows where something besides the key and department was filled in.
    .filter((r) => r.slice(kind === "faculty" ? 2 : 1).some((c) => c !== ""));
  if (!rows.length) return NextResponse.json({ saved: 0 });
  const table: ImportTable = { headers, rows };
  const options = { clearEmpty: false, skipInvalid: false };
  const preview = buildPreview({
    kind,
    table,
    mapping: autoMatch(kind, headers),
    options,
    existing: await loadExisting(ctx.supabase, kind),
  });
  const plan = applyPlan(preview, options);
  if (!plan) {
    const bad = preview.rows.find((r) => r.status === "invalid")!;
    return fail(400, `${bad.key}: ${bad.reasons.map((r) => describeReason(ctx.tr, r)).join(" ")}`);
  }

  // A small faculty / course import run, so the write is audited like any other.
  const detailsRun = crypto.randomUUID();
  const { error: runError } = await ctx.supabase.from("import_runs").insert({
    id: detailsRun,
    kind,
    status: "parsed",
    file_path: importObjectPath(runId, `review-${kind}.json`),
    file_name: `review-${kind}.json`,
    file_type: "json",
    created_by: ctx.userId,
    result: { table: { ...table, source: {} } } as unknown as Json,
  });
  if (runError) return fail(500, ctx.tr("imp.err.generic"));
  const { error } = await ctx.supabase.rpc("apply_master_import", {
    p_run: detailsRun,
    p_plan: plan as unknown as Json,
  });
  if (error) return fail(500, ctx.tr("imp.err.generic"));
  revalidatePath("/admin/routine/import");
  return NextResponse.json({ saved: plan.rows.length });
}
