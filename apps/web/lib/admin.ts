import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { isAnyAdmin, t, type AdminAccess, type MessageKey } from "@nfe/core";
import { getAppState, type AppState } from "./app-state";
import { createClient } from "./supabase/server";

export interface AdminContext extends AppState {
  user: NonNullable<AppState["user"]>;
  /** null when the signed-in user is not an admin. */
  access: AdminAccess | null;
  tr: (key: MessageKey) => string;
}

/**
 * The signed-in user's own admin row (RLS lets everyone read their own).
 * Not signed in → sign-in; pending / disabled → N-17.
 */
export const getAdminContext = cache(async (): Promise<AdminContext> => {
  const state = await getAppState();
  if (!state.user || state.stage === "sign-in" || state.stage === "guest") redirect("/sign-in");
  if (state.stage === "pending" || state.stage === "disabled") redirect("/pending");

  const supabase = await createClient();
  // The main admin whose email was set after they signed up claims the role here (AUTH-3).
  await supabase.rpc("claim_main_admin");
  const { data } = await supabase
    .from("admin_permissions")
    .select("is_main, areas, revoked_at")
    .eq("user_id", state.user.id)
    .maybeSingle();
  const access: AdminAccess | null =
    data && !data.revoked_at ? { isMain: data.is_main, areas: data.areas } : null;

  return {
    ...state,
    user: state.user,
    access: isAnyAdmin(access) ? access : null,
    tr: (key) => t(state.locale, key),
  };
});

/** Date and time as shown in the admin panel (Dhaka time). */
export function formatDateTime(value: string | Date, locale: "en" | "bn"): string {
  return new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Dhaka",
  }).format(new Date(value));
}

export function formatDate(value: string | Date, locale: "en" | "bn"): string {
  return new Intl.DateTimeFormat(locale === "bn" ? "bn-BD" : "en-GB", {
    dateStyle: "medium",
    timeZone: "Asia/Dhaka",
  }).format(new Date(value));
}
