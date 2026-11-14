import "server-only";
import type { NextResponse } from "next/server";
import { z } from "zod";
import {
  buildRoutineReview,
  en,
  fill,
  hasArea,
  readOverrides,
  readRoutineRules,
  readSetting,
  type MessageKey,
  type RoutineExisting,
  type RoutineOverrides,
  type RoutineParse,
  type RoutineReview,
} from "@nfe/core";
import { DEFAULT_ROUTINE_RULES, type RoutineParserRules } from "@nfe/parser";
import { readAdminAccess } from "./admin";
import { getAppState, type AppState } from "./app-state";
import { fail } from "./master-import";
import { createAdminClient, serviceRoleConfigured } from "./supabase/admin";
import { createClient } from "./supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export interface RoutineContext {
  supabase: Supabase;
  userId: string;
  tr: AppState["tr"];
}

/** Signed-in admin with the routine area, or a ready error response. */
export async function routineContext(): Promise<RoutineContext | NextResponse> {
  const state = await getAppState();
  const { tr } = state;
  if (!state.user || state.stage !== "ready") return fail(401, tr("imp.err.generic"));
  const access = await readAdminAccess(state.user.id);
  if (!hasArea(access, "routine")) {
    return fail(403, fill(tr("md.noArea"), { area: tr("admin.area.routine") }));
  }
  // The review reads private settings and the faculty table with the service role.
  if (!serviceRoleConfigured()) return fail(500, tr("rti.err.server"));
  return { supabase: await createClient(), userId: state.user.id, tr };
}

/**
 * The file format rules (`app_settings.parser.routine`, private). Read with the
 * service role because routine admins do not hold the settings area; callers
 * have checked the routine area first.
 */
export async function loadRoutineRules(): Promise<RoutineParserRules> {
  const { data } = await createAdminClient()
    .from("app_settings")
    .select("value")
    .eq("key", "parser.routine")
    .maybeSingle();
  return (readRoutineRules(data?.value) as RoutineParserRules | null) ?? DEFAULT_ROUTINE_RULES;
}

/** What the review compares the file with. Service role: the faculty table is admin-only per area. */
export async function loadRoutineExisting(semesterId: string): Promise<RoutineExisting> {
  const db = createAdminClient();
  const [
    departments,
    courses,
    faculty,
    batches,
    sections,
    labGroups,
    buildings,
    rooms,
    slots,
    floor,
  ] = await Promise.all([
    db.from("departments").select("id, code, is_home").is("deleted_at", null),
    db.from("courses").select("code, title").is("deleted_at", null).range(0, 9999),
    db
      .from("faculty")
      .select("initial, department_id, status, full_name, is_guest")
      .is("deleted_at", null)
      .range(0, 9999),
    db.from("batches").select("id, code, status").is("deleted_at", null),
    db.from("sections").select("id, batch_id, name").is("deleted_at", null).range(0, 9999),
    db.from("lab_groups").select("section_id, name").is("deleted_at", null).range(0, 9999),
    db.from("buildings").select("id, code").is("deleted_at", null),
    db.from("rooms").select("building_id, number").is("deleted_at", null).range(0, 9999),
    db
      .from("time_slots")
      .select("position, start_time, end_time, label")
      .eq("semester_id", semesterId)
      .is("deleted_at", null)
      .order("position"),
    db.from("app_settings").select("value").eq("key", "room.floor_rule").maybeSingle(),
  ]);
  const deptCode = new Map((departments.data ?? []).map((d) => [d.id, d.code]));
  const buildingCode = new Map((buildings.data ?? []).map((b) => [b.id, b.code]));
  const hhmm = (t: string) => t.slice(0, 5);
  return {
    homeDepartment: departments.data?.find((d) => d.is_home)?.code ?? null,
    departments: (departments.data ?? []).map((d) => d.code),
    courses: courses.data ?? [],
    faculty: (faculty.data ?? []).map((f) => ({
      initial: f.initial,
      department: f.department_id ? (deptCode.get(f.department_id) ?? null) : null,
      status: f.status,
      full_name: f.full_name,
      is_guest: f.is_guest,
    })),
    batches: (batches.data ?? []).map((b) => ({
      code: b.code,
      status: b.status,
      sections: (sections.data ?? [])
        .filter((s) => s.batch_id === b.id)
        .map((s) => ({
          name: s.name,
          labGroups: (labGroups.data ?? []).filter((g) => g.section_id === s.id).map((g) => g.name),
        })),
    })),
    buildings: (buildings.data ?? []).map((b) => b.code),
    rooms: (rooms.data ?? []).map((r) => ({
      building: buildingCode.get(r.building_id) ?? "",
      number: r.number,
    })),
    timeSlots: (slots.data ?? []).map((s) => ({
      position: s.position,
      start: hhmm(s.start_time),
      end: hhmm(s.end_time),
      label: s.label,
    })),
    floorRule: readSetting("room.floor_rule", floor.data?.value).mode,
  };
}

const storedSchema = z.object({
  parsed: z.object({
    timeSlots: z.array(z.any()),
    tables: z.array(z.any()),
    classes: z.array(z.any()),
    issues: z.array(z.any()),
  }),
  overrides: z.unknown().optional(),
});

export interface RoutineRun {
  id: string;
  status: string;
  fileName: string;
  filePath: string;
  semesterId: string;
  label: string;
  parsed: RoutineParse;
  overrides: RoutineOverrides;
  versionId: string | null;
}

/** A routine run the caller can see (RLS: routine area), or null. */
export async function loadRoutineRun(
  supabase: Supabase,
  runId: string,
): Promise<RoutineRun | null> {
  if (!z.string().uuid().safeParse(runId).success) return null;
  const { data } = await supabase
    .from("import_runs")
    .select(
      "id, kind, status, file_name, file_path, semester_id, version_label, result, version_id",
    )
    .eq("id", runId)
    .maybeSingle();
  if (!data || data.kind !== "routine" || !data.semester_id || !data.version_label) return null;
  const stored = storedSchema.safeParse(data.result);
  if (!stored.success) return null;
  return {
    id: data.id,
    status: data.status,
    fileName: data.file_name,
    filePath: data.file_path,
    semesterId: data.semester_id,
    label: data.version_label,
    parsed: stored.data.parsed as RoutineParse,
    overrides: readOverrides(stored.data.overrides),
    versionId: data.version_id,
  };
}

export async function reviewRun(run: RoutineRun): Promise<{
  review: RoutineReview;
  existing: RoutineExisting;
}> {
  const existing = await loadRoutineExisting(run.semesterId);
  return { review: buildRoutineReview(run.parsed, existing, run.overrides), existing };
}

/** Where the published file is kept: routine-files/<semester>/<label>.docx. */
export function routineFilePath(semesterId: string, label: string): string {
  return `${semesterId}/${label.replace(/[^A-Za-z0-9._-]+/g, "-")}.docx`;
}

/** Version label as the department writes it: "5", "5.1", "Final". */
export const versionLabel = z
  .string()
  .trim()
  .min(1)
  .max(20)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._ -]*$/);

/** "Monday 13:10" for a day index and slot position of the parsed file. */
export function whenText(
  tr: AppState["tr"],
  parsed: Pick<RoutineParse, "timeSlots">,
  day: number | null | undefined,
  slot: number | null | undefined,
): string {
  const time = parsed.timeSlots.find((s) => s.position === slot)?.start ?? "";
  return [day === null || day === undefined ? "" : tr(`day.${day}` as MessageKey), time]
    .filter(Boolean)
    .join(" ");
}

/** A parser problem or warning in the admin's language (the parser's own text is English only). */
export function describeIssue(
  tr: AppState["tr"],
  parsed: Pick<RoutineParse, "timeSlots">,
  issue: {
    code: string;
    table?: string | null;
    day?: number | null;
    slot?: number | null;
    raw?: string[];
  },
  prefix: "rti.issue" | "rti.warn",
): string {
  const key = `${prefix}.${issue.code}`;
  return fill(tr((key in en ? key : "rti.issue.other") as MessageKey), {
    table: issue.table ?? "",
    when: whenText(tr, parsed, issue.day, issue.slot),
    raw: (issue.raw ?? []).join(issue.code.endsWith("CLASH") ? ", " : " / "),
  });
}
