import { redirect } from "next/navigation";
import { hasArea } from "@nfe/core";
import { getAdminContext } from "@/lib/admin";
import { SETTINGS_MENU } from "./pages";

export default async function SettingsIndex() {
  const { access } = await getAdminContext();
  const first = SETTINGS_MENU.find((m) => hasArea(access, m.area));
  redirect(`/admin/settings/${first?.slug ?? "general"}`);
}
