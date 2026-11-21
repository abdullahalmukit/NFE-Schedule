"use server";

import { revalidatePath } from "next/cache";
import { classExceptionForm, dayIndexOfDate } from "@nfe/core";
import { getAdminContext } from "@/lib/admin";
import { formValues } from "@/lib/master-data";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "../_components/action-form";

const FIELDS = [
  "type",
  "section_id",
  "date",
  "class_slot_id",
  "lab_group_id",
  "course_id",
  "faculty_id",
  "new_date",
  "new_time_slot_id",
  "new_room_id",
  "note",
] as const;

const PATH = "/admin/routine/exceptions";

/**
 * ADM-RT-9: an admin cancels, reschedules or moves one class on one date, or
 * adds a makeup class, for any section. The insert trigger notifies the section
 * (or the lab group).
 */
export async function createException(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const { tr, user } = await getAdminContext();
  const parsed = classExceptionForm.safeParse(formValues(form, FIELDS));
  if (!parsed.success) {
    const key = parsed.error.issues[0]?.message ?? "";
    return { ok: false, message: tr(key in ERR ? ERR[key as keyof typeof ERR] : "rex.err.form") };
  }
  const v = parsed.data;
  const today = new Date().toISOString().slice(0, 10);
  if (v.date < today || (v.new_date && v.new_date < today)) {
    return { ok: false, message: tr("rtp.err.past") };
  }
  const supabase = await createClient();
  let labGroup = v.lab_group_id;
  if (v.class_slot_id) {
    // The class must be this section's and meet on the weekday of the date.
    const { data: slot } = await supabase
      .from("class_slots")
      .select("section_id, lab_group_id, day")
      .eq("id", v.class_slot_id)
      .maybeSingle();
    if (!slot || slot.section_id !== v.section_id)
      return { ok: false, message: tr("rex.err.class") };
    if (slot.day !== dayIndexOfDate(v.date)) return { ok: false, message: tr("rex.err.weekday") };
    labGroup = slot.lab_group_id;
  }
  const { error } = await supabase.from("class_exceptions").insert({
    ...v,
    lab_group_id: labGroup,
    created_by: user.id,
  });
  if (error) {
    console.error("class exception failed", error);
    return { ok: false, message: tr("imp.err.generic") };
  }
  revalidatePath(PATH);
  return { ok: true, message: tr("rex.saved") };
}

/** Withdraw an exception (kept with deleted_at). Students see the class as normal again. */
export async function withdrawException(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const { tr } = await getAdminContext();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("class_exceptions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", String(form.get("id") ?? ""))
    .select("id");
  if (error || !data?.length) return { ok: false, message: tr("imp.err.generic") };
  revalidatePath(PATH);
  return { ok: true, message: tr("rex.withdrawn") };
}

const ERR = {
  class: "rex.err.class",
  course: "rex.err.course",
  time: "rex.err.time",
  newTime: "rex.err.newTime",
  room: "rex.err.room",
} as const;
