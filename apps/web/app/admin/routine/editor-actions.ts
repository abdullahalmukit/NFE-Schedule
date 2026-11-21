"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { classSlotForm, nextLabel, type MessageKey } from "@nfe/core";
import { getAdminContext } from "@/lib/admin";
import { formValues } from "@/lib/master-data";
import { versionLabel } from "@/lib/routine-import";
import { loadVersion, versionInEffect } from "@/lib/routine-versions";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "../_components/action-form";

const editPath = (versionId: string) => `/admin/routine/versions/${versionId}/edit`;

/** Message for a database error from the editor functions and the draft-only trigger. */
async function dbError(error: { code?: string; message: string }): Promise<ActionResult> {
  const { tr } = await getAdminContext();
  const key: MessageKey = /draft already exists/i.test(error.message)
    ? "rti.err.draftExists"
    : error.code === "23505"
      ? "rti.err.labelTaken"
      : /Only a draft/i.test(error.message)
        ? "rte.err.notDraft"
        : /Bad (batch|section|lab group)/i.test(error.message)
          ? "rte.err.name"
          : "imp.err.generic";
  return { ok: false, message: tr(key) };
}

/**
 * "Edit current routine" (A-1 → A-2): opens the semester's draft, or makes
 * one by copying the version in effect ("5" → "5.1").
 */
export async function startEditing(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const { tr } = await getAdminContext();
  const semesterId = String(form.get("semester_id") ?? "");
  if (!z.string().uuid().safeParse(semesterId).success) {
    return { ok: false, message: tr("rti.err.semester") };
  }
  const supabase = await createClient();
  const { data: draft } = await supabase
    .from("routine_versions")
    .select("id")
    .eq("semester_id", semesterId)
    .eq("status", "draft")
    .is("deleted_at", null)
    .maybeSingle();
  if (draft) redirect(editPath(draft.id));

  const base = await versionInEffect(supabase, semesterId);
  if (!base) return { ok: false, message: tr("rte.err.nothingToEdit") };
  const { data: labels } = await supabase
    .from("routine_versions")
    .select("label")
    .eq("semester_id", semesterId);
  const { data: id, error } = await supabase.rpc("copy_version_to_draft", {
    p_from: base.id,
    p_label: nextLabel(
      base.label,
      (labels ?? []).map((l) => l.label),
    ),
    p_source: "manual",
  });
  if (error) return dbError(error);
  revalidatePath("/admin/routine");
  redirect(editPath(id));
}

/** ADM-RT-6: an empty draft to build the routine without a file. */
export async function startFromScratch(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const { tr } = await getAdminContext();
  const parsed = z
    .object({ semester_id: z.string().uuid(), label: versionLabel })
    .safeParse({ semester_id: form.get("semester_id"), label: form.get("label") });
  if (!parsed.success) return { ok: false, message: tr("rti.err.label") };
  const supabase = await createClient();
  const { data: id, error } = await supabase.rpc("create_empty_draft", {
    p_semester: parsed.data.semester_id,
    p_label: parsed.data.label,
  });
  if (error) return dbError(error);
  revalidatePath("/admin/routine");
  redirect(editPath(id));
}

const FIELDS = [
  "version_id",
  "section_id",
  "day",
  "time_slot_id",
  "course_id",
  "section_label",
  "lab_group_id",
  "faculty_id",
  "room_id",
  "span",
  "note",
] as const;

/** Add or edit one class of a draft (the trigger refuses anything but a draft). */
export async function saveClass(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { tr } = await getAdminContext();
  const parsed = classSlotForm.safeParse(formValues(form, FIELDS));
  if (!parsed.success) return { ok: false, message: tr("rte.err.form") };
  const id = String(form.get("id") ?? "");
  const supabase = await createClient();
  const version = await loadVersion(supabase, parsed.data.version_id);
  if (!version || version.status !== "draft") return { ok: false, message: tr("rte.err.notDraft") };
  const { version_id, ...values } = parsed.data;
  const result = z.string().uuid().safeParse(id).success
    ? await supabase
        .from("class_slots")
        .update(values)
        .eq("id", id)
        .eq("version_id", version_id)
        .select("id")
    : await supabase
        .from("class_slots")
        .insert({ version_id, ...values })
        .select("id");
  if (result.error) return dbError(result.error);
  if (!result.data?.length) return { ok: false, message: tr("imp.err.generic") };
  revalidatePath(editPath(version_id));
  return { ok: true, message: tr("md.saved") };
}

/** Remove a class from a draft (kept with deleted_at, never hard-deleted). */
export async function removeClass(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  await getAdminContext(); // signed-in admin only; RLS and the trigger decide the rest
  const id = String(form.get("id") ?? "");
  const versionId = String(form.get("version_id") ?? "");
  const supabase = await createClient();
  const { error } = await supabase
    .from("class_slots")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("version_id", versionId);
  if (error) return dbError(error);
  revalidatePath(editPath(versionId));
  redirect(
    `${editPath(versionId)}?${new URLSearchParams({
      batch: String(form.get("batch") ?? ""),
      section: String(form.get("section") ?? ""),
    })}`,
  );
}

/** Drag and drop on the grid: a class to another day / time slot. */
export async function moveClass(input: {
  versionId: string;
  id: string;
  day: number;
  timeSlotId: string;
}): Promise<ActionResult> {
  const { tr } = await getAdminContext();
  const parsed = z
    .object({
      versionId: z.string().uuid(),
      id: z.string().uuid(),
      day: z.number().int().min(0).max(6),
      timeSlotId: z.string().uuid(),
    })
    .safeParse(input);
  if (!parsed.success) return { ok: false, message: tr("rte.err.form") };
  const supabase = await createClient();
  const { error } = await supabase
    .from("class_slots")
    .update({ day: parsed.data.day, time_slot_id: parsed.data.timeSlotId })
    .eq("id", parsed.data.id)
    .eq("version_id", parsed.data.versionId);
  if (error) return dbError(error);
  revalidatePath(editPath(parsed.data.versionId));
  return { ok: true, message: tr("md.saved") };
}

/** Add a section (and its batch when new) or a lab group, from the editor. */
export async function addSectionOrGroup(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  await getAdminContext(); // signed-in admin only; the functions check the routine area
  const versionId = String(form.get("version_id") ?? "");
  const kind = form.get("kind");
  const supabase = await createClient();
  let batch = String(form.get("batch") ?? "")
    .trim()
    .toUpperCase();
  let section = String(form.get("section") ?? "")
    .trim()
    .toUpperCase();
  if (kind === "section") {
    const { error } = await supabase.rpc("ensure_section", { p_batch: batch, p_section: section });
    if (error) return dbError(error);
  } else {
    const { error } = await supabase.rpc("ensure_lab_group", {
      p_section: String(form.get("section_id") ?? ""),
      p_name: String(form.get("name") ?? ""),
    });
    if (error) return dbError(error);
    batch = String(form.get("batch") ?? "");
    section = String(form.get("section") ?? "");
  }
  revalidatePath(editPath(versionId));
  redirect(`${editPath(versionId)}?${new URLSearchParams({ batch, section })}`);
}

/** Rename a section or lab group (everywhere; students keep their membership). */
export async function renameSectionOrGroup(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const versionId = String(form.get("version_id") ?? "");
  const [target, targetId = ""] = String(form.get("target") ?? "").split(":");
  const kind = target === "section" ? "section" : "lab_group";
  const name = String(form.get("name") ?? "")
    .trim()
    .toUpperCase();
  const supabase = await createClient();
  const { error } = await supabase.rpc("rename_section_or_group", {
    p_kind: kind,
    p_id: targetId,
    p_name: name,
  });
  if (error) return dbError(error);
  revalidatePath(editPath(versionId));
  const batch = String(form.get("batch") ?? "");
  const section = kind === "section" ? name : String(form.get("section") ?? "");
  redirect(`${editPath(versionId)}?${new URLSearchParams({ batch, section })}`);
}
