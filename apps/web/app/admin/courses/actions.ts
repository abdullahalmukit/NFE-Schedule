"use server";

import { courseForm, fill, normalizeCourseCode } from "@nfe/core";
import { getAdminContext } from "@/lib/admin";
import { formValues, invalid, uuid, written, type ActionResult } from "@/lib/master-data";
import { createClient } from "@/lib/supabase/server";

const FIELDS = ["code", "title", "title_bn", "credit", "type", "offering_department_id"] as const;

/** Add or edit a course (ADM-MD-4); the code is normalised to "dddd-ddd[d]". */
export async function saveCourse(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const parsed = courseForm.safeParse(formValues(form, FIELDS));
  if (!parsed.success) return invalid(parsed.error);
  const id = String(form.get("id") ?? "");
  const supabase = await createClient();
  const result = uuid.test(id)
    ? await supabase.from("courses").update(parsed.data).eq("id", id).select("id")
    : await supabase.from("courses").insert(parsed.data).select("id");
  const saved = await written(result, "courses", ["/admin/courses"]);
  const removed = normalizeCourseCode(String(form.get("code") ?? ""))?.removedSection;
  if (saved.ok && removed) {
    const { tr } = await getAdminContext();
    return { ok: true, message: fill(tr("course.sectionRemoved"), { s: removed }) };
  }
  return saved;
}

/** Archive or restore (status), never delete. */
export async function setCourseStatus(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const id = String(form.get("id") ?? "");
  const status = form.get("status") === "active" ? "active" : "archived";
  if (!uuid.test(id)) return { ok: false, message: "" };
  const supabase = await createClient();
  const result = await supabase.from("courses").update({ status }).eq("id", id).select("id");
  return written(
    result,
    "courses",
    ["/admin/courses"],
    status === "active" ? "md.restored" : "md.archived",
  );
}
