"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAdminContext } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "../settings/actions";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const entryInput = z
  .object({
    date: day,
    end_date: day.or(z.literal("")).transform((v) => v || null),
    type: z.enum(["holiday", "exam_week", "no_class", "special"]),
    title: z
      .string()
      .trim()
      .max(80)
      .transform((v) => v || null),
    batch_ids: z.array(z.string().uuid()),
  })
  .refine((e) => !e.end_date || e.end_date >= e.date, "range");

/** A-12: add a holiday / exam week / no-class / special day or range (ADM-SET-2). */
export async function addCalendarDay(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const { tr } = await getAdminContext();
  const parsed = entryInput.safeParse({
    date: form.get("date"),
    end_date: form.get("end_date") ?? "",
    type: form.get("type"),
    title: form.get("title") ?? "",
    batch_ids: form.getAll("batch_ids"),
  });
  if (!parsed.success) {
    const range = parsed.error.issues.some((i) => i.message === "range");
    return { ok: false, message: tr(range ? "cal.err.range" : "cal.err.generic") };
  }
  const { batch_ids, ...values } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("calendar_days")
    .insert({ ...values, applies_to: batch_ids.length ? { batch_ids } : null });
  if (error) return { ok: false, message: tr("cal.noArea") };
  revalidatePath("/admin/calendar");
  return { ok: true, message: tr("settings.saved") };
}

/** Removal is a soft delete so phones drop it on their next sync. */
export async function removeCalendarDay(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const { tr } = await getAdminContext();
  const id = z.string().uuid().safeParse(form.get("id"));
  if (!id.success) return { ok: false, message: tr("cal.err.generic") };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("calendar_days")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id.data)
    .select("id");
  if (error || !data?.length) return { ok: false, message: tr("cal.noArea") };
  revalidatePath("/admin/calendar");
  return { ok: true, message: tr("cal.removed") };
}
