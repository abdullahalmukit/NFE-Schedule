import { NextResponse } from "next/server";
import { z } from "zod";
import { routineApplyPlan, type Json } from "@nfe/core";
import { fail } from "@/lib/master-import";
import { loadRoutineRun, reviewRun, routineContext, routineFilePath } from "@/lib/routine-import";

export const runtime = "nodejs";

const body = z.object({ runId: z.string().uuid() });

/**
 * "Save as draft": the review is built again from the stored file and the
 * admin's decisions; when nothing blocks it, the file is kept in
 * `routine-files/` and `apply_routine_import` writes a draft version with its
 * classes in one transaction. Publishing is a separate step (routine-publish).
 */
export async function POST(request: Request) {
  const ctx = await routineContext();
  if (ctx instanceof NextResponse) return ctx;
  const { supabase, tr } = ctx;
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, tr("imp.err.generic"));
  const run = await loadRoutineRun(supabase, parsed.data.runId);
  if (!run) return fail(404, tr("imp.err.noRun"));
  if (run.status !== "parsed") return fail(409, tr("imp.err.applied"));

  const { review, existing } = await reviewRun(run);
  const sourceFilePath = routineFilePath(run.semesterId, run.label);
  const plan = routineApplyPlan({
    parsed: run.parsed,
    review,
    overrides: run.overrides,
    existing,
    semesterId: run.semesterId,
    label: run.label,
    sourceFilePath,
  });
  if (!plan) return fail(400, tr("rti.blocked"));

  const { data: file } = await supabase.storage.from("imports").download(run.filePath);
  if (!file) return fail(404, tr("imp.err.noRun"));
  const { error: copyError } = await supabase.storage
    .from("routine-files")
    .upload(sourceFilePath, file, {
      upsert: true,
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
  if (copyError) return fail(500, tr("imp.err.generic"));

  const { data, error } = await supabase.rpc("apply_routine_import", {
    p_run: run.id,
    p_plan: plan as unknown as Json,
  });
  if (error) {
    if (/already applied/i.test(error.message)) return fail(409, tr("imp.err.applied"));
    if (/draft already exists/i.test(error.message)) return fail(409, tr("rti.err.draftExists"));
    if (error.code === "23505") return fail(409, tr("rti.err.labelTaken"));
    console.error("routine import: apply failed", error);
    return fail(500, tr("imp.err.generic"));
  }
  const result = data as { version_id: string; classes: number };
  return NextResponse.json({ versionId: result.version_id, classes: result.classes });
}
