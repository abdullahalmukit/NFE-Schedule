"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { en, fill, isSettingKey, SETTINGS, validateSetting, type Json } from "@nfe/core";
import { getAdminContext } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  ok: boolean;
  message: string;
}

/** Saves one app_settings key after validating it with its schema (ADM-SET-1). */
export async function saveSetting(key: string, value: unknown): Promise<ActionResult> {
  const { tr } = await getAdminContext();
  if (!isSettingKey(key) || SETTINGS[key].readOnly)
    return { ok: false, message: tr("settings.error") };
  const checked = validateSetting(key, value);
  if (!checked.ok) {
    return {
      ok: false,
      message: fill(tr("settings.invalid"), { issues: checked.issues.join("; ") }),
    };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_settings")
    .upsert({ key, value: checked.value as Json, is_public: SETTINGS[key].isPublic })
    .select("key");
  if (error || !data?.length)
    return { ok: false, message: tr(error ? "settings.error" : "settings.noArea") };
  revalidatePath("/", "layout");
  return { ok: true, message: tr("settings.saved") };
}

const ROLES = ["guest", "student", "cr", "faculty", "admin"] as const;
const featureInput = z.object({
  key: z.string().min(1),
  enabled: z.boolean(),
  roles: z.array(z.enum(ROLES)),
  min_app_version: z
    .string()
    .trim()
    .regex(/^(\d+(\.\d+){0,2})?$/, "x.y.z")
    .transform((v) => v || null),
});

/** Feature flags: on / off, who sees it, minimum app version. */
export async function saveFeature(input: z.input<typeof featureInput>): Promise<ActionResult> {
  const { tr } = await getAdminContext();
  const parsed = featureInput.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: fill(tr("settings.invalid"), {
        issues: parsed.error.issues.map((i) => i.message).join("; "),
      }),
    };
  }
  const { key, ...values } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("feature_flags")
    .update(values)
    .eq("key", key)
    .select("key");
  if (error || !data?.length)
    return { ok: false, message: tr(error ? "settings.error" : "settings.noArea") };
  revalidatePath("/admin/settings/features");
  return { ok: true, message: tr("settings.saved") };
}

const textInput = z.object({
  locale: z.enum(["en", "bn"]),
  key: z.string().refine((k) => k in en, "Unknown text key"),
  value: z.string().max(2000),
});

/** Text overrides: empty text = back to the built-in text (row kept, marked deleted for sync). */
export async function saveText(input: z.input<typeof textInput>): Promise<ActionResult> {
  const { tr } = await getAdminContext();
  const parsed = textInput.safeParse(input);
  if (!parsed.success) return { ok: false, message: tr("settings.error") };
  const { locale, key } = parsed.data;
  const value = parsed.data.value.trim();
  const supabase = await createClient();
  const { error } = value
    ? await supabase.from("i18n_overrides").upsert({ locale, key, value, deleted_at: null })
    : await supabase
        .from("i18n_overrides")
        .update({ deleted_at: new Date().toISOString() })
        .eq("locale", locale)
        .eq("key", key);
  if (error) return { ok: false, message: tr("settings.noArea") };
  revalidatePath("/", "layout");
  return { ok: true, message: tr("settings.saved") };
}
