import { NextResponse } from "next/server";
import { z } from "zod";
import {
  autoMatch,
  fill,
  headerScore,
  importObjectPath,
  MAX_IMPORT_BYTES,
  type Json,
} from "@nfe/core";
import {
  masterFileType,
  MasterReadError,
  MAX_IMPORT_ROWS,
  readMasterFile,
} from "@nfe/parser/master";
import { fail, importContext, kindSchema } from "@/lib/master-import";

export const runtime = "nodejs";

const body = z.object({
  kind: kindSchema,
  runId: z.string().uuid(),
  fileName: z.string().trim().min(1).max(200),
  sheet: z.string().max(100).optional(),
});

/**
 * Step 2 of the import wizard (A-7): the browser has uploaded the file to
 * `imports/<runId>/…`; this records the run, reads the file into a table and
 * suggests the column matching. Nothing reaches the live tables here.
 */
export async function POST(request: Request) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { kind, runId, fileName, sheet } = parsed.data;
  const ctx = await importContext(kind);
  if (ctx instanceof NextResponse) return ctx;
  const { supabase, tr } = ctx;

  const type = masterFileType(fileName);
  if (!type) return fail(400, tr("imp.err.unsupported"));
  const path = importObjectPath(runId, fileName);

  const { data: run } = await supabase
    .from("import_runs")
    .select("id, kind, status, file_path")
    .eq("id", runId)
    .maybeSingle();
  if (run && (run.kind !== kind || run.file_path !== path)) return fail(404, tr("imp.err.noRun"));
  if (run && run.status === "applied") return fail(409, tr("imp.err.applied"));
  if (!run) {
    const { error } = await supabase.from("import_runs").insert({
      id: runId,
      kind,
      file_path: path,
      file_name: fileName,
      file_type: type,
      created_by: ctx.userId,
    });
    if (error) return fail(403, tr("imp.err.generic"));
  }

  const { data: blob, error: downloadError } = await supabase.storage
    .from("imports")
    .download(path);
  if (downloadError || !blob) return fail(404, tr("imp.err.noRun"));
  if (blob.size > MAX_IMPORT_BYTES) return fail(400, tr("imp.upload.tooBig"));

  let table;
  try {
    table = await readMasterFile(new Uint8Array(await blob.arrayBuffer()), type, {
      score: (h) => headerScore(kind, h),
      sheet,
      kind,
    });
  } catch (e) {
    await supabase.from("import_runs").update({ status: "failed" }).eq("id", runId);
    if (e instanceof MasterReadError) {
      return fail(422, fill(tr(`imp.err.${e.code}`), { n: MAX_IMPORT_ROWS }));
    }
    console.error("master import: read failed", e);
    return fail(500, tr("imp.err.badFile"));
  }

  const [{ error: saveError }, { data: presets }] = await Promise.all([
    supabase
      .from("import_runs")
      .update({ status: "parsed", result: { table } as unknown as Json })
      .eq("id", runId),
    supabase
      .from("import_mapping_presets")
      .select("id, name, mapping")
      .eq("kind", kind)
      .order("name"),
  ]);
  if (saveError) return fail(500, tr("imp.err.generic"));

  return NextResponse.json({
    runId,
    headers: table.headers,
    sample: table.rows.slice(0, 5),
    rowCount: table.rows.length,
    sheets: table.sheets ?? [],
    sheet: table.source.sheet ?? null,
    page: table.source.page ?? null,
    mapping: autoMatch(kind, table.headers),
    presets: presets ?? [],
  });
}
