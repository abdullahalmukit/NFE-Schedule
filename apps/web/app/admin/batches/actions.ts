"use server";

import { batchForm, labGroupForm, sectionForm } from "@nfe/core";
import { formValues, invalid, uuid, written, type ActionResult } from "@/lib/master-data";
import { createClient } from "@/lib/supabase/server";

const PATH = ["/admin/batches"];
const idOf = (form: FormData) => {
  const id = String(form.get("id") ?? "");
  return uuid.test(id) ? id : null;
};

export async function saveBatch(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const parsed = batchForm.safeParse(formValues(form, ["code", "intake_semester"]));
  if (!parsed.success) return invalid(parsed.error);
  const id = idOf(form);
  const supabase = await createClient();
  const result = id
    ? await supabase.from("batches").update(parsed.data).eq("id", id).select("id")
    : await supabase.from("batches").insert(parsed.data).select("id");
  return written(result, "batches", PATH);
}

/** Graduated batches stay in the data (history, alumni) but leave pickers. */
export async function setBatchStatus(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const id = idOf(form);
  const graduated = form.get("status") === "graduated";
  if (!id) return { ok: false, message: "" };
  const supabase = await createClient();
  const result = await supabase
    .from("batches")
    .update({
      status: graduated ? "graduated" : "active",
      graduated_at: graduated ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .select("id");
  return written(result, "batches", PATH);
}

export async function setBatchArchived(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const id = idOf(form);
  const archive = form.get("archive") === "1";
  if (!id) return { ok: false, message: "" };
  const supabase = await createClient();
  const result = await supabase
    .from("batches")
    .update({ deleted_at: archive ? new Date().toISOString() : null })
    .eq("id", id)
    .select("id");
  return written(result, "batches", PATH, archive ? "md.archived" : "md.restored");
}

/** Add a section to a batch, or rename one. */
export async function saveSection(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const parsed = sectionForm.safeParse(formValues(form, ["batch_id", "name"]));
  if (!parsed.success) return invalid(parsed.error);
  const id = idOf(form);
  const supabase = await createClient();
  const result = id
    ? await supabase.from("sections").update({ name: parsed.data.name }).eq("id", id).select("id")
    : await supabase.from("sections").insert(parsed.data).select("id");
  return written(result, "batches", PATH);
}

export async function saveLabGroup(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const parsed = labGroupForm.safeParse(formValues(form, ["section_id", "name"]));
  if (!parsed.success) return invalid(parsed.error);
  const id = idOf(form);
  const supabase = await createClient();
  const result = id
    ? await supabase.from("lab_groups").update({ name: parsed.data.name }).eq("id", id).select("id")
    : await supabase.from("lab_groups").insert(parsed.data).select("id");
  return written(result, "batches", PATH);
}

/** Archive or restore a section or lab group (status), never delete. */
export async function setGroupStatus(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const id = idOf(form);
  const table = form.get("table") === "lab_groups" ? "lab_groups" : "sections";
  const status = form.get("status") === "active" ? "active" : "archived";
  if (!id) return { ok: false, message: "" };
  const supabase = await createClient();
  const result = await supabase.from(table).update({ status }).eq("id", id).select("id");
  return written(result, "batches", PATH, status === "active" ? "md.restored" : "md.archived");
}
