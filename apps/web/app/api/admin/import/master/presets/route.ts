import { NextResponse } from "next/server";
import { z } from "zod";
import { mappingSchema } from "@nfe/core";
import { fail, importContext, kindSchema } from "@/lib/master-import";

const body = z.object({
  kind: kindSchema,
  name: z.string().trim().max(80),
  mapping: mappingSchema,
});

/** "Save as preset" (ADM-MD-2): the column matching under a name; same name replaces it. */
export async function POST(request: Request) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { kind, name, mapping } = parsed.data;
  const ctx = await importContext(kind);
  if (ctx instanceof NextResponse) return ctx;
  if (!name) return fail(400, ctx.tr("imp.err.presetName"));

  const { error } = await ctx.supabase
    .from("import_mapping_presets")
    .upsert({ kind, name, mapping, created_by: ctx.userId }, { onConflict: "kind,name" });
  if (error) return fail(500, ctx.tr("imp.err.generic"));
  const { data: presets } = await ctx.supabase
    .from("import_mapping_presets")
    .select("id, name, mapping")
    .eq("kind", kind)
    .order("name");
  return NextResponse.json({ presets: presets ?? [], message: ctx.tr("imp.match.presetSaved") });
}
