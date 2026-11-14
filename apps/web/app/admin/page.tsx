import Link from "next/link";
import { fill, hasArea, type MessageKey } from "@nfe/core";
import { KeyValueRow, Panel, StatCard } from "@nfe/ui/web";
import { formatDate, getAdminContext } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

interface Dashboard {
  semester: { id: string; name: string } | null;
  version: { id: string; label: string; effective_from: string | null } | null;
  students_by_batch: { batch: string; students: number }[];
  students_without_section: number;
  pending_signups: number;
  pending_cr_requests: number;
  open_reports: number;
  admins: number;
}

/** A-0 Dashboard: active semester and version, counts, quick actions. */
export default async function AdminDashboard() {
  const { access, tr, locale } = await getAdminContext();
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_dashboard");
  const d = data as unknown as Dashboard | null; // jsonb from admin_dashboard(), shape above

  const quick: { href: string; label: MessageKey; show: boolean }[] = [
    { href: "/admin/routine", label: "dash.qImport", show: hasArea(access, "routine") },
    { href: "/admin/notices", label: "dash.qNotice", show: hasArea(access, "notices") },
    { href: "/admin/cr-requests", label: "dash.qCr", show: hasArea(access, "cr") },
    { href: "/admin/admins", label: "dash.qAdmins", show: Boolean(access?.isMain) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-display font-bold">{tr("dash.title")}</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title={tr("dash.semester")}>
          <p className="font-display text-title font-bold">
            {d?.semester?.name ?? <span className="text-text-muted">{tr("dash.noSemester")}</span>}
          </p>
        </Panel>
        <Panel title={tr("dash.version")}>
          <p className="font-display text-title font-bold">
            {d?.version ? (
              fill(tr("dash.versionLabel"), {
                label: d.version.label,
                date: d.version.effective_from ? formatDate(d.version.effective_from, locale) : "—",
              })
            ) : (
              <span className="text-text-muted">{tr("dash.noVersion")}</span>
            )}
          </p>
        </Panel>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard value={String(d?.pending_signups ?? 0)} label={tr("dash.pendingSignups")} />
        <StatCard value={String(d?.pending_cr_requests ?? 0)} label={tr("dash.pendingCr")} />
        <StatCard value={String(d?.open_reports ?? 0)} label={tr("dash.openReports")} />
        <StatCard value={String(d?.admins ?? 0)} label={tr("dash.admins")} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Panel title={tr("dash.studentsByBatch")}>
          {d && d.students_by_batch.length > 0 ? (
            <div>
              {d.students_by_batch.map((b) => (
                <KeyValueRow key={b.batch} label={b.batch} value={String(b.students)} />
              ))}
              <KeyValueRow
                label={tr("dash.withoutSection")}
                value={String(d.students_without_section)}
              />
            </div>
          ) : (
            <p className="font-body text-body text-text-muted">{tr("dash.noStudents")}</p>
          )}
        </Panel>
        <Panel title={tr("dash.quick")}>
          <div className="flex flex-col gap-2">
            {quick
              .filter((q) => q.show)
              .map((q) => (
                <Link
                  key={q.href}
                  href={q.href}
                  className="rounded-xl border border-border px-4 py-3 font-body text-body font-semibold text-text hover:bg-surface-raised"
                >
                  {tr(q.label)}
                </Link>
              ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
