"use server";

import { revalidatePath } from "next/cache";
import { hasArea, routineRulesSetting, type Json } from "@nfe/core";
import { getAdminContext } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "../actions";

/** Settings → Routine format: `{use_defaults: true}` or full rules, checked before saving. */
export async function saveRoutineRules(value: unknown): Promise<ActionResult> {
  const { access, tr } = await getAdminContext();
  if (!hasArea(access, "routine") && !hasArea(access, "settings")) {
    return { ok: false, message: tr("rtf.err.noArea") };
  }
  const parsed = routineRulesSetting.safeParse(value);
  if (!parsed.success) return { ok: false, message: tr("rtf.err.rules") };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_routine_rules", { p_value: parsed.data as Json });
  if (error) return { ok: false, message: tr("imp.err.generic") };
  revalidatePath("/admin/settings/routine");
  return { ok: true, message: tr("rtf.saved") };
}
