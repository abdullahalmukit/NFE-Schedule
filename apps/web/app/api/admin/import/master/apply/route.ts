import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { applyPlan, invalidRowsCsv, type Json } from "@nfe/core";
import {
  describeReason,
  fail,
  importContext,
  loadParsedRun,
  previewBody,
  previewFor,
  requiredError,
} from "@/lib/master-import";

export const runtime = "nodejs";

/**
 * Step 4 (A-7): the preview is built again from the stored file and the same
 * choices, then written in one transaction by `apply_master_import` (RLS and
 * audit triggers apply as the admin).
 */
export async function POST(request: Request) {
  const parsed = previewBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { kind, runId, mapping, options } = parsed.data;
  const ctx = await importContext(kind);
  if (ctx instanceof NextResponse) return ctx;
  const missing = requiredError(ctx, kind, mapping);
  if (missing) return missing;
  const run = await loadParsedRun(ctx, kind, runId);
  if (run instanceof NextResponse) return run;

  const preview = await previewFor(ctx, kind, run, parsed.data);
  const plan = applyPlan(preview, options);
  if (!plan) return fail(400, ctx.tr("imp.preview.blocked"));

  await ctx.supabase.from("import_runs").update({ mapping }).eq("id", runId);
  const { data, error } = await ctx.supabase.rpc("apply_master_import", {
    p_run: runId,
    p_plan: plan as unknown as Json,
  });
  if (error) {
    if (/already applied/i.test(error.message)) return fail(409, ctx.tr("imp.err.applied"));
    if (error.code === "40001" || error.code === "23505") {
      return fail(409, ctx.tr("imp.err.changed"));
    }
    console.error("master import: apply failed", error);
    return fail(500, ctx.tr("imp.err.generic"));
  }

  revalidatePath(kind === "faculty" ? "/admin/faculty" : "/admin/courses");
  const result = (data ?? {}) as { inserted?: number; updated?: number; departments?: number };
  return NextResponse.json({
    inserted: result.inserted ?? 0,
    updated: result.updated ?? 0,
    departments: result.departments ?? 0,
    skipped: preview.counts.invalid,
    invalidCsv: preview.counts.invalid
      ? invalidRowsCsv(run.table, preview, (r) => describeReason(ctx.tr, r))
      : null,
  });
}
