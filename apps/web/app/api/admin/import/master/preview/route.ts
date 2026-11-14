import { NextResponse } from "next/server";
import { applyPlan } from "@nfe/core";
import {
  displayPreview,
  importContext,
  loadParsedRun,
  previewBody,
  previewFor,
  requiredError,
} from "@/lib/master-import";

export const runtime = "nodejs";

/** Step 3 (A-7): every row as new / update / unchanged / invalid, compared with the database. */
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
  await ctx.supabase.from("import_runs").update({ mapping }).eq("id", runId);
  const plan = applyPlan(preview, options);
  return NextResponse.json({
    ...displayPreview(ctx.tr, kind, preview),
    applyCount: plan?.rows.length ?? 0,
    blocked: plan === null,
  });
}
