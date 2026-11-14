import { NextResponse } from "next/server";
import { z } from "zod";
import {
  EMPTY_OVERRIDES,
  importObjectPath,
  MAX_IMPORT_BYTES,
  readOverrides,
  type Json,
} from "@nfe/core";
import { parseRoutineDocx } from "@nfe/parser";
import { fail } from "@/lib/master-import";
import { loadRoutineRules, routineContext, versionLabel } from "@/lib/routine-import";

export const runtime = "nodejs";

const body = z.object({
  runId: z.string().uuid(),
  fileName: z.string().trim().min(1).max(200),
  semesterId: z.string().uuid(),
  label: versionLabel,
});

/**
 * ADM-RT-1 "Read tables": the browser has uploaded the .docx to
 * `imports/<runId>/…`; this records the run, parses the file with the
 * semester's format rules and stores the result for the review screen.
 * Nothing reaches the routine before "Save as draft".
 */
export async function POST(request: Request) {
  const ctx = await routineContext();
  if (ctx instanceof NextResponse) return ctx;
  const { supabase, tr } = ctx;
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, tr("rti.err.label"));
  const { runId, fileName, semesterId, label } = parsed.data;
  if (!fileName.toLowerCase().endsWith(".docx")) return fail(400, tr("rti.err.docx"));

  const [{ data: semester }, { data: taken }] = await Promise.all([
    supabase
      .from("semesters")
      .select("id")
      .eq("id", semesterId)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase
      .from("routine_versions")
      .select("id")
      .eq("semester_id", semesterId)
      .eq("label", label)
      .maybeSingle(),
  ]);
  if (!semester) return fail(400, tr("rti.err.semester"));
  if (taken) return fail(409, tr("rti.err.labelTaken"));

  const path = importObjectPath(runId, fileName);
  const { error: insertError } = await supabase.from("import_runs").insert({
    id: runId,
    kind: "routine",
    file_path: path,
    file_name: fileName,
    file_type: "docx",
    semester_id: semesterId,
    version_label: label,
    created_by: ctx.userId,
  });
  if (insertError) return fail(409, tr("imp.err.generic"));

  const { data: blob } = await supabase.storage.from("imports").download(path);
  if (!blob) return fail(404, tr("imp.err.noRun"));
  if (blob.size > MAX_IMPORT_BYTES) return fail(400, tr("imp.upload.tooBig"));

  const rules = await loadRoutineRules();
  let result;
  try {
    result = parseRoutineDocx(new Uint8Array(await blob.arrayBuffer()), rules);
  } catch {
    await supabase.from("import_runs").update({ status: "failed" }).eq("id", runId);
    return fail(422, tr("rti.err.notWord"));
  }

  // Lab-group renames chosen in an earlier import of this semester are kept.
  const { data: previous } = await supabase
    .from("import_runs")
    .select("result")
    .eq("kind", "routine")
    .eq("semester_id", semesterId)
    .eq("status", "applied")
    .order("applied_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const before = readOverrides((previous?.result as { overrides?: unknown } | null)?.overrides);
  const crossTables = new Set(
    result.classes
      .filter((c) => c.labGroup && c.sectionLabel !== c.section)
      .map((c) => `${c.batch}-${c.section}`),
  );
  const overrides = {
    ...EMPTY_OVERRIDES,
    renameLabGroups: before.renameLabGroups.filter((t) => crossTables.has(t)),
  };

  const { error } = await supabase
    .from("import_runs")
    .update({ status: "parsed", result: { parsed: result, overrides } as unknown as Json })
    .eq("id", runId);
  if (error) return fail(500, tr("imp.err.generic"));
  return NextResponse.json({ runId });
}
