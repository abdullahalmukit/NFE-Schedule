import { en, hasArea, readRoutineRules, type MessageKey, type RoutineRules } from "@nfe/core";
import { DEFAULT_ROUTINE_RULES } from "@nfe/parser";
import { Card, Panel } from "@nfe/ui/web";
import { getAdminContext } from "@/lib/admin";
import { createAdminClient, serviceRoleConfigured } from "@/lib/supabase/admin";
import { RoutineFormatForm } from "./routine-format-form";

const KEYS = Object.keys(en).filter(
  (k) => k.startsWith("rtf.") || k === "imp.err.generic",
) as MessageKey[];

/**
 * Settings → Routine format (ADM-RT-11). The rules are a private setting, read
 * with the service role after checking the routine or settings area; saving
 * goes through `set_routine_rules` as the admin.
 */
export default async function RoutineFormatPage() {
  const { access, tr } = await getAdminContext();
  if (!hasArea(access, "routine") && !hasArea(access, "settings")) {
    return (
      <Card>
        <p className="font-body text-body text-text-muted">{tr("rtf.err.noArea")}</p>
      </Card>
    );
  }
  if (!serviceRoleConfigured()) {
    return (
      <Card>
        <p className="font-body text-body text-danger">{tr("rti.err.server")}</p>
      </Card>
    );
  }
  const { data } = await createAdminClient()
    .from("app_settings")
    .select("value")
    .eq("key", "parser.routine")
    .maybeSingle();
  return (
    <Panel title={tr("rtf.title")} description={tr("rtf.help")}>
      <RoutineFormatForm
        stored={readRoutineRules(data?.value)}
        defaults={DEFAULT_ROUTINE_RULES as RoutineRules}
        labels={Object.fromEntries(KEYS.map((k) => [k, tr(k)]))}
      />
    </Panel>
  );
}
