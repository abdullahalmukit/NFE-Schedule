import { redirect } from "next/navigation";
import { settingsMenu } from "@nfe/core";
import { getAdminContext } from "@/lib/admin";

/** Opens the first Settings page this admin may use (the calendar for calendar-only admins). */
export default async function SettingsIndex() {
  const { access } = await getAdminContext();
  redirect(settingsMenu(access)[0]?.href ?? "/admin");
}
