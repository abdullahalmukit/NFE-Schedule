import { NextResponse } from "next/server";
import { z } from "zod";
import { fail } from "@/lib/master-import";
import { loadRoutineRun, routineContext } from "@/lib/routine-import";

const body = z.object({ runId: z.string().uuid() });

/** "Cancel" on the review screen: the run is closed and the uploaded file removed. */
export async function POST(request: Request) {
  const ctx = await routineContext();
  if (ctx instanceof NextResponse) return ctx;
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, ctx.tr("imp.err.generic"));
  const run = await loadRoutineRun(ctx.supabase, parsed.data.runId);
  if (!run) return fail(404, ctx.tr("imp.err.noRun"));
  if (run.status === "applied") return fail(409, ctx.tr("imp.err.applied"));
  await ctx.supabase.from("import_runs").update({ status: "cancelled" }).eq("id", run.id);
  await ctx.supabase.storage.from("imports").remove([run.filePath]);
  return NextResponse.json({ ok: true });
}
