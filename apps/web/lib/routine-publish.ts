import "server-only";
import { affectedIds, readOverrides, type VersionClass } from "@nfe/core";
import type { Change } from "@nfe/parser";
import {
  diffVersions,
  loadVersionClasses,
  versionInEffect,
  type VersionRow,
} from "./routine-versions";
import type { createClient } from "./supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export interface PublishPlan {
  /** The version students see today (null before the first publish). */
  base: VersionRow | null;
  after: VersionClass[];
  changes: Change<VersionClass>[];
  unchanged: number;
  sectionIds: string[];
  labGroupIds: string[];
  /** Batches marked "graduated when published" on the import review of this draft. */
  graduate: string[];
}

/** What publishing this draft changes and whom it notifies (ADM-RT-3, ADM-RT-4). */
export async function publishPlan(supabase: Supabase, draft: VersionRow): Promise<PublishPlan> {
  const base = await versionInEffect(supabase, draft.semester_id);
  const [before, after, { data: sections }, { data: labGroups }, { data: run }] = await Promise.all(
    [
      base && base.id !== draft.id ? loadVersionClasses(supabase, base.id) : Promise.resolve([]),
      loadVersionClasses(supabase, draft.id),
      supabase
        .from("sections")
        .select("id, name, batches(code)")
        .is("deleted_at", null)
        .range(0, 9999),
      supabase
        .from("lab_groups")
        .select("id, name, sections(name, batches(code))")
        .is("deleted_at", null)
        .range(0, 9999),
      supabase
        .from("import_runs")
        .select("result")
        .eq("version_id", draft.id)
        .eq("kind", "routine")
        .maybeSingle(),
    ],
  );
  const diff = diffVersions(before, after);
  const ids = affectedIds(
    diff.affected,
    (sections ?? []).map((s) => ({ id: s.id, batch: s.batches?.code ?? "", name: s.name })),
    (labGroups ?? []).map((g) => ({
      id: g.id,
      batch: g.sections?.batches?.code ?? "",
      section: g.sections?.name ?? "",
      name: g.name,
    })),
  );
  return {
    base,
    after,
    changes: diff.changes,
    unchanged: diff.unchanged,
    ...ids,
    graduate: readOverrides((run?.result as { overrides?: unknown } | null)?.overrides).graduate,
  };
}
