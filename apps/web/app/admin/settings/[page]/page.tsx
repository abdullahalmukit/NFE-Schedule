import { notFound } from "next/navigation";
import {
  hasArea,
  readSetting,
  SETTINGS,
  SETTINGS_PAGES,
  type MessageKey,
  type SettingField,
  type SettingKey,
} from "@nfe/core";
import { Card } from "@nfe/ui/web";
import { getAdminContext } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { SettingForm, type ClientField } from "../setting-form";

/** One A-16 sub-page: a form per app_settings key, built from the key's definition. */
export default async function SettingsPage({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  const def = SETTINGS_PAGES.find((p) => p.slug === page);
  if (!def) notFound();
  const { access, tr } = await getAdminContext();
  if (!hasArea(access, "settings")) {
    return (
      <Card>
        <p className="font-body text-body text-text-muted">{tr("settings.noArea")}</p>
      </Card>
    );
  }

  const keys = def.keys as readonly SettingKey[];
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", [...keys]);

  // Labels are translated here so the client form receives plain strings.
  const resolve = (f: SettingField): ClientField => {
    const label = tr(f.label);
    switch (f.kind) {
      case "select":
      case "order":
        return {
          ...f,
          label,
          options: f.options.map((o) => ({ value: o.value, label: tr(o.label) })),
        };
      case "multi":
        return {
          ...f,
          label,
          options: f.options.map((o) => ({ value: o.value, label: tr(o.label) })),
        };
      case "fixedList":
        return { ...f, label, itemLabels: f.itemLabels.map((l: MessageKey) => tr(l)) };
      default:
        return { ...f, label };
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {keys.map((key) => {
        const setting = SETTINGS[key];
        const stored = data?.find((r) => r.key === key)?.value;
        return (
          <SettingForm
            key={key}
            settingKey={key}
            title={tr(setting.title)}
            help={tr(setting.help)}
            fields={setting.fields.map(resolve)}
            initial={readSetting(key, stored)}
            readOnly={"readOnly" in setting ? setting.readOnly : false}
            readOnlyNote={tr("settings.readOnly")}
            labels={{
              save: tr("settings.save"),
              add: tr("settings.add"),
              remove: tr("settings.remove"),
              up: tr("settings.up"),
              down: tr("settings.down"),
            }}
          />
        );
      })}
    </div>
  );
}
