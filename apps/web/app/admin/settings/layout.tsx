import type { ReactNode } from "react";
import { settingsMenu } from "@nfe/core";
import { Card } from "@nfe/ui/web";
import { getAdminContext } from "@/lib/admin";
import { SettingsNav } from "./settings-nav";

/** A-16 Settings: side menu with only the pages this admin may open. */
export default async function SettingsLayout({ children }: { children: ReactNode }) {
  const { access, tr } = await getAdminContext();
  const items = settingsMenu(access).map((m) => ({ href: m.href, label: tr(m.title) }));
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
