"use server";

import { revalidatePath } from "next/cache";
import { getAdminContext } from "@/lib/admin";
import { uuid } from "@/lib/master-data";
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
