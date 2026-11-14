import type { ReactNode } from "react";
import { hasArea } from "@nfe/core";
import { Card } from "@nfe/ui/web";
import { getAdminContext } from "@/lib/admin";
import { SETTINGS_MENU } from "./pages";
import { SettingsNav } from "./settings-nav";

/** A-16 Settings: side menu of sub-pages the admin may open. */
export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const { access, tr } = await getAdminContext();
  const items = SETTINGS_MENU.filter((m) => hasArea(access, m.area)).map((m) => ({
    href: `/admin/settings/${m.slug}`,
    label: tr(m.title),
  }));
  if (items.length === 0) {
    return (
      <Card>
        <p className="font-body text-body text-text-muted">{tr("settings.noArea")}</p>
      </Card>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-display font-bold">{tr("settings.title")}</h1>
      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <SettingsNav items={items} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
