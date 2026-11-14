import { NextResponse } from "next/server";
import { fill, hasArea, routineRulesSchema } from "@nfe/core";
import { parseRoutineDocx, type RoutineParserRules } from "@nfe/parser";
import { readAdminAccess } from "@/lib/admin";
import { getAppState } from "@/lib/app-state";
import { fail } from "@/lib/master-import";
import { describeIssue } from "@/lib/routine-import";

export const runtime = "nodejs";

const MAX_BYTES = 4 * 1024 * 1024;

/**
 * Settings → Routine format → "Test on a file" (ADM-RT-11): parses an uploaded
 * sample with the edited (unsaved) rules and returns the counts and the first
 * problems. Nothing is stored.
 */
export async function POST(request: Request) {
  const state = await getAppState();
  const { tr } = state;
  if (!state.user || state.stage !== "ready") return fail(401, tr("imp.err.generic"));
  const access = await readAdminAccess(state.user.id);
  if (!hasArea(access, "routine") && !hasArea(access, "settings")) {
    return fail(403, fill(tr("md.noArea"), { area: tr("admin.area.routine") }));
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const rulesText = form?.get("rules");
  if (!(file instanceof File) || typeof rulesText !== "string") {
    return fail(400, tr("rti.err.docx"));
  }
  if (file.size > MAX_BYTES) return fail(400, tr("imp.upload.tooBig"));
  let rulesJson: unknown;
  try {
    rulesJson = JSON.parse(rulesText);
  } catch {
    return fail(400, tr("rtf.err.rules"));
  }
  const rules = routineRulesSchema.safeParse(rulesJson);
  if (!rules.success) return fail(400, tr("rtf.err.rules"));

  try {
    const r = parseRoutineDocx(
      new Uint8Array(await file.arrayBuffer()),
      rules.data as RoutineParserRules,
    );
    return NextResponse.json({
      stats: {
        tables: r.stats.tables,
        classes: r.stats.classes,
        labSessions: r.stats.labSessions,
        courseCodes: r.stats.courseCodes,
        facultyInitials: r.stats.facultyInitials,
        rooms: r.stats.rooms,
        errors: r.stats.errors,
        warnings: r.stats.warnings,
      },
      timeSlots: r.timeSlots.map((s) => `${s.start}–${s.end}`),
      problems: r.issues
        .filter((i) => i.severity !== "info")
        .slice(0, 15)
        .map((i) => ({
          severity: i.severity,
          message: describeIssue(tr, r, i, i.severity === "error" ? "rti.issue" : "rti.warn"),
        })),
    });
  } catch {
    return fail(422, tr("rti.err.notWord"));
  }
}
