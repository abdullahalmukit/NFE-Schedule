"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fill } from "@nfe/core";
import { getAdminContext } from "@/lib/admin";
import { clashReport } from "@/lib/routine-editor";
import { uuid } from "@/lib/master-data";
import { versionLabel } from "@/lib/routine-import";
import { loadVersion } from "@/lib/routine-versions";
import { publishPlan } from "@/lib/routine-publish";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "../_components/action-form";

/** Discard a draft version: hidden (deleted_at), never removed; published versions are untouched. */
export async function discardDraft(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const { tr } = await getAdminContext();
  const id = String(form.get("id") ?? "");
  if (!uuid.test(id)) return { ok: false, message: tr("imp.err.generic") };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("routine_versions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "draft")
    .select("id");
  if (error || !data?.length) return { ok: false, message: tr("imp.err.generic") };
  revalidatePath("/admin/routine");
  return { ok: true, message: tr("rth.discarded") };
}

const publishInput = z.object({
  id: z.string().uuid(),
  effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notify: z.boolean(),
  summary: z.string().trim().max(500),
  anyway: z.boolean(),
  graduate: z.array(z.string().max(10)).max(50),
});

/**
 * A-3 Publish (ADM-RT-4): the diff and the affected sections / lab groups are
 * worked out again on the server, then `publish_routine_version` runs as the
 * admin in one transaction.
 */
export async function publishVersion(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const { tr } = await getAdminContext();
  const parsed = publishInput.safeParse({
    id: form.get("id"),
    effective_from: form.get("effective_from"),
    notify: form.get("notify") === "on",
    summary: String(form.get("summary") ?? ""),
    anyway: form.get("anyway") === "on",
    graduate: form.getAll("graduate").map(String),
  });
  if (!parsed.success) return { ok: false, message: tr("rtp.err.input") };
  const { id, effective_from, notify, summary, graduate, anyway } = parsed.data;
  const today = new Date().toISOString().slice(0, 10);
  if (effective_from < today) return { ok: false, message: tr("rtp.err.past") };

  const supabase = await createClient();
  const version = await loadVersion(supabase, id);
  if (!version || version.status !== "draft") return { ok: false, message: tr("rtp.err.notDraft") };
  const plan = await publishPlan(supabase, version);
  // Clashes block publishing unless the admin ticks "Publish anyway"; that choice is noted on the version.
  const clashes = clashReport(plan.after, [], tr).messages.length;
  if (clashes && !anyway) return { ok: false, message: tr("rte.err.clashes") };
  if (clashes) {
    await supabase
      .from("routine_versions")
      .update({ notes: fill(tr("rte.publishedWithClashes"), { n: clashes }) })
      .eq("id", id);
  }
  const { error } = await supabase.rpc("publish_routine_version", {
    p_version: id,
    p_effective_from: effective_from,
    p_notify: notify,
    p_affected_section_ids: plan.sectionIds,
    p_affected_lab_group_ids: plan.labGroupIds,
    p_summary: summary,
    p_graduate: graduate,
  });
  if (error) {
    console.error("publish failed", error);
    return { ok: false, message: tr("imp.err.generic") };
  }
  revalidatePath("/admin/routine");
  redirect(`/admin/routine/versions/${id}?published=1`);
}

const restoreInput = z.object({ id: z.string().uuid(), label: versionLabel });

/** Restore (ADM-RT-7): a new draft copied from the chosen version, then its publish page. */
export async function restoreVersion(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const { tr } = await getAdminContext();
  const parsed = restoreInput.safeParse({ id: form.get("id"), label: form.get("label") });
  if (!parsed.success) return { ok: false, message: tr("rti.err.label") };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("copy_version_to_draft", {
    p_from: parsed.data.id,
    p_label: parsed.data.label,
    p_source: "rollback",
  });
  if (error) {
    if (/draft already exists/i.test(error.message))
      return { ok: false, message: tr("rti.err.draftExists") };
    if (error.code === "23505") return { ok: false, message: tr("rti.err.labelTaken") };
    return { ok: false, message: tr("imp.err.generic") };
  }
  revalidatePath("/admin/routine");
  redirect(`/admin/routine/versions/${data}/publish`);
}
