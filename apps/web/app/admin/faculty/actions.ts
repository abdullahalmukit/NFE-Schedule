"use server";

import { departmentForm, facultyForm } from "@nfe/core";
import { formValues, invalid, uuid, written, type ActionResult } from "@/lib/master-data";
import { createClient } from "@/lib/supabase/server";

const PATH = ["/admin/faculty"];
const FACULTY_FIELDS = [
  "initial",
  "full_name",
  "designation",
  "department_id",
  "email",
  "phone",
  "office_room",
  "consultation_hours",
  "status",
  "is_guest",
  "joined_on",
  "left_on",
  "show_email",
  "show_phone",
  "show_office_room",
] as const;

/** Add or edit a teacher, including contact visibility (ADM-MD-4, ADM-MD-5). */
export async function saveFaculty(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const parsed = facultyForm.safeParse(formValues(form, FACULTY_FIELDS));
  if (!parsed.success) return invalid(parsed.error);
  const id = String(form.get("id") ?? "");
  const supabase = await createClient();
  const result = uuid.test(id)
    ? await supabase.from("faculty").update(parsed.data).eq("id", id).select("id")
    : await supabase.from("faculty").insert(parsed.data).select("id");
  return written(result, "faculty", PATH, "md.saved", "fac.duplicateInitial");
}

/** "Archive" a teacher = soft delete; restoring clears it. Linked accounts keep their history. */
export async function setFacultyArchived(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const id = String(form.get("id") ?? "");
  const archive = form.get("archive") === "1";
  if (!uuid.test(id)) return { ok: false, message: "" };
  const supabase = await createClient();
  const result = await supabase
    .from("faculty")
    .update({ deleted_at: archive ? new Date().toISOString() : null })
    .eq("id", id)
    .select("id");
  return written(
    result,
    "faculty",
    PATH,
    archive ? "md.archived" : "md.restored",
    "fac.duplicateInitial",
  );
}

/** After the browser uploaded `faculty-photos/<path>`: store the path, remove an older file. */
export async function setFacultyPhoto(id: string, path: string | null): Promise<ActionResult> {
  if (!uuid.test(id) || (path !== null && !new RegExp(`^${id}\\.(jpg|png|webp)$`).test(path))) {
    return { ok: false, message: "" };
  }
  const supabase = await createClient();
  const { data: before } = await supabase
    .from("faculty")
    .select("photo_path")
    .eq("id", id)
    .maybeSingle();
  const result = await supabase
    .from("faculty")
    .update({ photo_path: path })
    .eq("id", id)
    .select("id");
  const saved = await written(result, "faculty", PATH, "fac.photoSaved");
  if (saved.ok && before?.photo_path && before.photo_path !== path) {
    await supabase.storage.from("faculty-photos").remove([before.photo_path]);
  }
  return saved;
}

export async function saveDepartment(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const parsed = departmentForm.safeParse(formValues(form, ["code", "name"]));
  if (!parsed.success) return invalid(parsed.error);
  const id = String(form.get("id") ?? "");
  const supabase = await createClient();
  const result = uuid.test(id)
    ? await supabase.from("departments").update(parsed.data).eq("id", id).select("id")
    : await supabase.from("departments").insert(parsed.data).select("id");
  return written(result, "faculty", PATH);
}

export async function setDepartmentArchived(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const id = String(form.get("id") ?? "");
  const archive = form.get("archive") === "1";
  if (!uuid.test(id)) return { ok: false, message: "" };
  const supabase = await createClient();
  const result = await supabase
    .from("departments")
    .update({ deleted_at: archive ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("is_home", false)
    .select("id");
  return written(result, "faculty", PATH, archive ? "md.archived" : "md.restored");
}
