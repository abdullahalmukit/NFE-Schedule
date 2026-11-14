import { ADMIN_AREAS, type MessageKey } from "@nfe/core";
import { Card, Panel, Pill } from "@nfe/ui/web";
import { formatDateTime, getAdminContext } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { AdminAreasForm, CancelInviteForm, InviteForm, TransferForm } from "./admin-forms";

/** A-17 Admins (main administrator only): invite, areas, revoke, transfer (AUTH-4, AUTH-5). */
export default async function AdminsPage() {
  const { access, tr, locale, user } = await getAdminContext();
  if (!access?.isMain) {
    return (
      <Card>
        <p className="font-body text-body text-text-muted">{tr("admin.mainOnly")}</p>
      </Card>
    );
  }

  const supabase = await createClient();
  const [{ data: admins }, { data: invites }] = await Promise.all([
    supabase
      .from("admin_permissions")
      .select(
        "user_id, is_main, areas, granted_at, profile:profiles!admin_permissions_user_id_fkey(email, full_name)",
      )
      .is("revoked_at", null)
      .order("is_main", { ascending: false })
      .order("granted_at"),
    supabase
      .from("admin_invites")
      .select("email, areas, invited_at")
      .is("accepted_at", null)
      .order("invited_at", { ascending: false }),
  ]);

  const areaOptions = ADMIN_AREAS.map((a) => ({
    value: a,
    label: tr(`admin.area.${a}` as MessageKey),
  }));
  const areaNames = (areas: readonly string[]) =>
    areas.map((a) => tr(`admin.area.${a}` as MessageKey)).join(", ");

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-display font-bold">{tr("admins.title")}</h1>
        <p className="mt-1 font-body text-body text-text-muted">{tr("admins.intro")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Panel title={tr("admins.current")}>
          <div className="flex flex-col divide-y divide-border">
            {(admins ?? []).map((a) => (
              <div key={a.user_id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-body text-body font-semibold">
                    {a.profile?.full_name ?? a.profile?.email}
                  </span>
                  <span className="font-body text-small text-text-muted">{a.profile?.email}</span>
                  {a.is_main ? <Pill label={tr("admins.main")} tone="accent" size="sm" /> : null}
                  {a.user_id === user.id ? <Pill label={tr("admins.you")} size="sm" /> : null}
                </div>
                {a.is_main ? null : (
                  <AdminAreasForm
                    userId={a.user_id}
                    areas={areaOptions}
                    checked={a.areas}
                    labels={{ save: tr("admins.save"), revoke: tr("admins.revoke") }}
                  />
                )}
              </div>
            ))}
          </div>
        </Panel>

        <div className="flex flex-col gap-6">
          <Panel title={tr("admins.invite")}>
            <InviteForm
              areas={areaOptions}
              labels={{
                email: tr("admins.email"),
                areas: tr("admins.areas"),
                send: tr("admins.send"),
              }}
            />
          </Panel>

          <Panel title={tr("admins.pending")}>
            {invites && invites.length > 0 ? (
              <div className="flex flex-col divide-y divide-border">
                {invites.map((i) => (
                  <div key={i.email} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                    <span className="font-body text-body font-semibold">{i.email}</span>
                    <span className="font-body text-small text-text-muted">
                      {areaNames(i.areas)} · {formatDateTime(i.invited_at, locale)}
                    </span>
                    <CancelInviteForm email={i.email} label={tr("admins.cancel")} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="font-body text-body text-text-muted">{tr("admins.none")}</p>
            )}
          </Panel>

          <Panel title={tr("admins.transfer")} description={tr("admins.transferHelp")}>
            <TransferForm
              labels={{
                to: tr("admins.transferTo"),
                confirm: tr("admins.transferConfirm"),
                send: tr("admins.transfer"),
              }}
            />
          </Panel>
        </div>
      </div>
    </div>
  );
}
