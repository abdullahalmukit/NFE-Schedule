import { NextResponse } from "next/server";
import { z } from "zod";
import { warningId, type Json } from "@nfe/core";
import { fail } from "@/lib/master-import";
import { loadRoutineRun, routineContext } from "@/lib/routine-import";

const body = z.object({
  runId: z.string().uuid(),
  /** One decision at a time from the review screen. */
  action: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("accept"), ids: z.array(z.string().max(300)).max(500) }),
    z.object({ kind: z.literal("unaccept"), ids: z.array(z.string().max(300)).max(500) }),
    z.object({ kind: z.literal("labGroups"), table: z.string().max(20), rename: z.boolean() }),
    z.object({ kind: z.literal("graduate"), batch: z.string().max(10), on: z.boolean() }),
    z.object({ kind: z.literal("timeSlots"), value: z.enum(["keep", "update"]) }),
  ]),
});

const toggle = (list: string[], items: string[], on: boolean) =>
  on ? [...new Set([...list, ...items])] : list.filter((x) => !items.includes(x));

/** Saves one review decision (warnings, lab-group renames, graduation, time slots). */
export async function POST(request: Request) {
  const ctx = await routineContext();
  if (ctx instanceof NextResponse) return ctx;
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, ctx.tr("imp.err.generic"));
  const run = await loadRoutineRun(ctx.supabase, parsed.data.runId);
  if (!run) return fail(404, ctx.tr("imp.err.noRun"));
  if (run.status !== "parsed") return fail(409, ctx.tr("imp.err.applied"));

  const a = parsed.data.action;
  const o = { ...run.overrides };
  if (a.kind === "accept" || a.kind === "unaccept")
    o.accepted = toggle(o.accepted, a.ids, a.kind === "accept");
  if (a.kind === "labGroups") o.renameLabGroups = toggle(o.renameLabGroups, [a.table], a.rename);
  if (a.kind === "labGroups" && !a.rename) {
    // "Keep as written" accepts that table's lab-group warnings.
    const ids = run.parsed.issues
      .filter((i) => i.code === "CROSS_SECTION_LABEL" && i.table === a.table)
      .map(warningId);
    o.accepted = toggle(o.accepted, ids, true);
  }
  if (a.kind === "graduate") o.graduate = toggle(o.graduate, [a.batch], a.on);
  if (a.kind === "timeSlots") o.timeSlots = a.value;

  const { data: row } = await ctx.supabase
    .from("import_runs")
    .select("result")
    .eq("id", run.id)
    .single();
  const result = { ...(row?.result as Record<string, unknown>), overrides: o };
  const { error } = await ctx.supabase
    .from("import_runs")
    .update({ result: result as unknown as Json })
    .eq("id", run.id);
  if (error) return fail(500, ctx.tr("imp.err.generic"));
  return NextResponse.json({ ok: true });
}
