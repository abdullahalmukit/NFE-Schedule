"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminContext } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "../actions";

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .or(z.literal(""))
  .transform((v) => v || null);
const time = z.string().regex(/^\d{2}:\d{2}$/);

const semesterInput = z
  .object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(1).max(40),
    starts_on: date,
    ends_on: date,
  })
  .refine((s) => !s.starts_on || !s.ends_on || s.ends_on > s.starts_on, "range");

async function done(
  error: { message: string } | null,
  okKey: "settings.saved",
): Promise<ActionResult> {
  const { tr } = await getAdminContext();
  if (error) return { ok: false, message: tr("sem.err.generic") };
  revalidatePath("/admin/settings/semesters");
  revalidatePath("/admin");
  return { ok: true, message: tr(okKey) };
}

async function invalid(range: boolean): Promise<ActionResult> {
  const { tr } = await getAdminContext();
  return { ok: false, message: tr(range ? "sem.err.range" : "sem.err.generic") };
}

export async function saveSemester(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const parsed = semesterInput.safeParse({
    id: form.get("id") || undefined,
    name: form.get("name"),
    starts_on: form.get("starts_on") ?? "",
    ends_on: form.get("ends_on") ?? "",
  });
  if (!parsed.success) return invalid(parsed.error.issues.some((i) => i.message === "range"));
  const { id, ...values } = parsed.data;
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("semesters").update(values).eq("id", id)
    : await supabase.from("semesters").insert(values);
  return done(error, "settings.saved");
}

export async function activateSemester(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const id = z.string().uuid().safeParse(form.get("id"));
  if (!id.success) return invalid(false);
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_active_semester", { p_semester: id.data });
  return done(error, "settings.saved");
}

/** Archive = soft delete; the active semester cannot be archived. */
export async function archiveSemester(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const id = z.string().uuid().safeParse(form.get("id"));
  if (!id.success) return invalid(false);
  const supabase = await createClient();
  const { error } = await supabase
    .from("semesters")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id.data)
    .eq("is_active", false);
  return done(error, "settings.saved");
}

const slotInput = z
  .object({
    semester_id: z.string().uuid(),
    position: z.coerce.number().int().min(1).max(20),
    start_time: time,
    end_time: time,
    label: z
      .string()
      .trim()
      .max(30)
      .transform((v) => v || null),
  })
  .refine((s) => s.end_time > s.start_time, "range");

/** Add or change a slot; a slot number used before (and removed) is reused. */
export async function saveSlot(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const parsed = slotInput.safeParse({
    semester_id: form.get("semester_id"),
    position: form.get("position"),
    start_time: form.get("start_time"),
    end_time: form.get("end_time"),
    label: form.get("label") ?? "",
  });
  if (!parsed.success) return invalid(parsed.error.issues.some((i) => i.message === "range"));
  const supabase = await createClient();
  const { error } = await supabase
    .from("time_slots")
    .upsert({ ...parsed.data, deleted_at: null }, { onConflict: "semester_id,position" });
  return done(error, "settings.saved");
}

export async function removeSlot(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const id = z.string().uuid().safeParse(form.get("id"));
  if (!id.success) return invalid(false);
  const supabase = await createClient();
  const { error } = await supabase
    .from("time_slots")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id.data);
  return done(error, "settings.saved");
}
