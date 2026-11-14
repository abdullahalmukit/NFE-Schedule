import { en, hasArea, type MessageKey } from "@nfe/core";
import { Card, Panel } from "@nfe/ui/web";
import { getAdminContext } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { FeatureRow } from "./feature-row";

/** Settings → Features: feature flags (ADM-SET-1). */
export default async function FeaturesPage() {
  const { access, tr } = await getAdminContext();
  if (!hasArea(access, "settings")) {
    return (
      <Card>
        <p className="font-body text-body text-text-muted">{tr("settings.noArea")}</p>
      </Card>
    );
  }
  const supabase = await createClient();
  const { data: flags } = await supabase
    .from("feature_flags")
    .select("key, enabled, roles, min_app_version, description")
    .is("deleted_at", null)
    .order("key");

  const nameOf = (key: string, fallback: string | null) => {
    const k = `feat.name.${key}`;
    return k in en ? tr(k as MessageKey) : (fallback ?? key);
  };

  return (
    <Panel title={tr("setp.features")} description={tr("feat.help")}>
      {(flags ?? []).map((f) => (
        <FeatureRow
          key={f.key}
          flagKey={f.key}
          name={nameOf(f.key, f.description)}
          enabled={f.enabled}
          roles={f.roles}
          minAppVersion={f.min_app_version}
          labels={{
            enabled: tr("feat.enabled"),
            roles: tr("feat.roles"),
            minVersion: tr("feat.minVersion"),
            save: tr("settings.save"),
            guest: tr("role.guest"),
            student: tr("role.student"),
            cr: tr("role.cr"),
            faculty: tr("role.faculty"),
            admin: tr("role.admin"),
          }}
        />
      ))}
    </Panel>
  );
}
