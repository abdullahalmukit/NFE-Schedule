"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ADMIN_AREAS, adminErrorKey, fill, type MessageKey } from "@nfe/core";
import { getAdminContext } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export interface ActionResult {
  ok: boolean;
  message: string;
}

const areasField = z.array(z.enum(ADMIN_AREAS));
const email = z.string().trim().toLowerCase().email();
const userId = z.string().uuid();

async function run(
  call: (
    supabase: Awaited<ReturnType<typeof createClient>>,
  ) => PromiseLike<{ error: { message: string } | null }>,
  success: string,
): Promise<ActionResult> {
  const { tr } = await getAdminContext();
  const supabase = await createClient();
  const { error } = await call(supabase);
  if (error) return { ok: false, message: tr(adminErrorKey(error.message)) };
  revalidatePath("/admin/admins");
  return { ok: true, message: success };
}

async function fail(key: MessageKey): Promise<ActionResult> {
  const { tr } = await getAdminContext();
  return { ok: false, message: tr(key) };
}

export async function inviteAdmin(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const parsedEmail = email.safeParse(form.get("email"));
  const areas = areasField.safeParse(form.getAll("areas"));
  if (!parsedEmail.success) return fail("admins.err.email");
  if (!areas.success || areas.data.length === 0) return fail("admins.err.areas");
  const { tr } = await getAdminContext();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("invite_admin", {
    p_email: parsedEmail.data,
    p_areas: areas.data,
  });
  if (error) return { ok: false, message: tr(adminErrorKey(error.message)) };
  revalidatePath("/admin/admins");
  return {
    ok: true,
    message: fill(tr(data === "granted" ? "admins.granted" : "admins.invited"), {
      email: parsedEmail.data,
    }),
  };
}

export async function saveAdminAreas(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const user = userId.safeParse(form.get("user"));
  const areas = areasField.safeParse(form.getAll("areas"));
  if (!user.success) return fail("admins.err.generic");
  if (!areas.success || areas.data.length === 0) return fail("admins.err.areas");
  const { tr } = await getAdminContext();
  return run(
    (s) => s.rpc("set_admin_areas", { p_user: user.data, p_areas: areas.data }),
    tr("admins.saved"),
  );
}

export async function revokeAdmin(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const user = userId.safeParse(form.get("user"));
  if (!user.success) return fail("admins.err.generic");
  const { tr } = await getAdminContext();
  return run((s) => s.rpc("revoke_admin", { p_user: user.data }), tr("admins.revoked"));
}

export async function cancelInvite(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const parsed = email.safeParse(form.get("email"));
  if (!parsed.success) return fail("admins.err.email");
  const { tr } = await getAdminContext();
  return run((s) => s.rpc("cancel_admin_invite", { p_email: parsed.data }), tr("admins.cancelled"));
}

export async function transferMainRole(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const parsed = email.safeParse(form.get("email"));
  if (!parsed.success) return fail("admins.err.email");
  if (form.get("confirm") !== "TRANSFER") return fail("admins.err.confirm");
  const { tr } = await getAdminContext();
  const supabase = await createClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", parsed.data)
    .maybeSingle();
  if (!target) return fail("admins.err.account");
  const result = await run(
    (s) => s.rpc("transfer_main_admin", { p_user: target.id }),
    tr("admins.transferDone"),
  );
  if (result.ok) revalidatePath("/admin", "layout");
  return result;
}
