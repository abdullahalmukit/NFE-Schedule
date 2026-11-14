import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import {
  tableToJson,
  templateTable,
  toCsv,
  type MasterKind,
  type TemplateCourse,
  type TemplateFaculty,
} from "@nfe/core";
import { writeXlsx } from "@nfe/parser/master";
import { importContext, kindSchema, loadExisting, type Supabase } from "@/lib/master-import";

export const runtime = "nodejs";

const query = z.object({ kind: kindSchema, format: z.enum(["csv", "xlsx", "json"]) });

/** Classes per teacher and per course in the routine version in effect (empty before the first publish). */
async function routineCounts(supabase: Supabase) {
  const byFaculty = new Map<string, number>();
  const byCourse = new Map<string, { sessions: number; lab: boolean }>();
  const { data: semesterId } = await supabase.rpc("active_semester_id");
  if (!semesterId) return { byFaculty, byCourse };
  const { data: version } = await supabase
    .from("routine_versions")
    .select("id")
    .eq("semester_id", semesterId)
    .eq("status", "published")
    .is("deleted_at", null)
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!version) return { byFaculty, byCourse };
  const { data: slots } = await supabase
    .from("class_slots")
    .select("faculty_id, course_id, lab_group_id")
    .eq("version_id", version.id)
    .is("deleted_at", null)
    .range(0, 19999);
  for (const s of slots ?? []) {
    if (s.faculty_id) byFaculty.set(s.faculty_id, (byFaculty.get(s.faculty_id) ?? 0) + 1);
    const c = byCourse.get(s.course_id) ?? { sessions: 0, lab: false };
    byCourse.set(s.course_id, { sessions: c.sessions + 1, lab: c.lab || s.lab_group_id !== null });
  }
  return { byFaculty, byCourse };
}

/**
 * ADM-MD-3: template pre-filled with every teacher / course in the system and
 * what is already stored, plus the classes each has in the routine in effect.
 * Informational columns (classes_per_week, detected_type, sessions_per_week)
 * are ignored when the file is imported back.
 */
export async function GET(request: NextRequest) {
  const parsed = query.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) return NextResponse.json({ error: "bad request" }, { status: 400 });
  const { kind, format } = parsed.data;
  const ctx = await importContext(kind);
  if (ctx instanceof NextResponse) return ctx;

  const [existing, counts] = await Promise.all([
    loadExisting(ctx.supabase, kind),
    routineCounts(ctx.supabase),
  ]);
  const home = existing.homeDepartment;
  const records: (TemplateFaculty | TemplateCourse)[] =
    kind === "faculty"
      ? (existing.faculty ?? [])
          .map(({ id, ...f }) => ({
            ...f,
            department: f.department ?? home,
            classes_per_week: counts.byFaculty.get(id) ?? null,
          }))
          .sort(
            (a, b) =>
              (b.classes_per_week ?? 0) - (a.classes_per_week ?? 0) ||
              a.initial.localeCompare(b.initial),
          )
      : (existing.courses ?? [])
          .map(({ id, ...c }) => {
            const n = counts.byCourse.get(id);
            return {
              ...c,
              detected_type: n ? (n.lab ? ("lab" as const) : ("theory" as const)) : null,
              sessions_per_week: n?.sessions ?? null,
            };
          })
          .sort((a, b) => a.code.localeCompare(b.code));

  const table = templateTable(kind, records);
  const name = `${kind}_template`;
  return file(kind, format, table, name);
}

function file(
  kind: MasterKind,
  format: "csv" | "xlsx" | "json",
  table: ReturnType<typeof templateTable>,
  name: string,
) {
  const headers = (type: string, ext: string) => ({
    "Content-Type": type,
    "Content-Disposition": `attachment; filename="${name}.${ext}"`,
    "Cache-Control": "no-store",
  });
  if (format === "xlsx") {
    const bytes = writeXlsx(table, kind === "faculty" ? "Faculty" : "Courses");
    return new NextResponse(bytes as BodyInit, {
      headers: headers("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"),
    });
  }
  if (format === "json") {
    return new NextResponse(JSON.stringify(tableToJson(table), null, 2), {
      headers: headers("application/json; charset=utf-8", "json"),
    });
  }
  // The byte order mark makes Excel open the CSV as UTF-8 (Bangla titles).
  const bom = String.fromCharCode(0xfeff);
  return new NextResponse(bom + toCsv(table.headers, table.rows), {
    headers: headers("text/csv; charset=utf-8", "csv"),
  });
}
