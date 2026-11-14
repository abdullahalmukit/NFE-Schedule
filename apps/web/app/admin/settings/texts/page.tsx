import { bn, en, hasArea, type MessageKey } from "@nfe/core";
import { Card, Panel } from "@nfe/ui/web";
import { getAdminContext } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { TextsEditor, type TextRow } from "./texts-editor";

/** Settings → Texts: admin overrides for any app text, English and Bangla (ADM-SET-1). */
export default async function TextsPage() {
  const { access, tr } = await getAdminContext();
  if (!hasArea(access, "settings")) {
    return (
      <Card>
        <p className="font-body text-body text-text-muted">{tr("settings.noArea")}</p>
      </Card>
    );
  }
  const supabase = await createClient();
  const { data: overrides } = await supabase
    .from("i18n_overrides")
    .select("locale, key, value")
    .is("deleted_at", null);
  const find = (locale: string, key: string) =>
    overrides?.find((o) => o.locale === locale && o.key === key)?.value ?? "";

  const rows: TextRow[] = (Object.keys(en) as MessageKey[]).map((key) => ({
    key,
    en: en[key],
    bn: bn[key],
    overrideEn: find("en", key),
    overrideBn: find("bn", key),
  }));

  return (
    <Panel title={tr("setp.texts")} description={tr("texts.help")}>
      <TextsEditor
        rows={rows}
        labels={{
          search: tr("texts.search"),
          key: tr("texts.key"),
          builtIn: tr("texts.builtIn"),
          override: tr("texts.override"),
          save: tr("settings.save"),
          onlyChanged: tr("texts.onlyChanged"),
          changed: tr("texts.changed"),
        }}
      />
    </Panel>
  );
}
