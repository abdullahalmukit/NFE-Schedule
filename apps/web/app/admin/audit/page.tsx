import Link from "next/link";
import { AUDITED_TABLES, changedFields, showValue, type MessageKey } from "@nfe/core";
import { Card, Pill } from "@nfe/ui/web";
import { formatDateTime, getAdminContext } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

const PAGE = 50;

interface Search {
  entity?: string;
  actor?: string;
  from?: string;
  to?: string;
  before?: string;
}

const inputClass =
  "h-11 rounded-xl border border-border bg-surface px-3 font-body text-small text-text outline-none focus:border-accent";

const actionTone = { insert: "accent", update: "info", delete: "danger" } as const;

/** A-18 Audit log (main administrator): who changed what, when, before / after (ADM-AUD-1, NF-9). */
export default async function AuditPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { access, tr, locale } = await getAdminContext();
  if (!access?.isMain) {
    return (
      <Card>
        <p className="font-body text-body text-text-muted">{tr("admin.mainOnly")}</p>
      </Card>
    );
  }
  const q = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("audit_log")
    .select("id, actor_id, action, entity, entity_id, before, after, at")
    .order("id", { ascending: false })
    .limit(PAGE + 1);
  if (q.entity && (AUDITED_TABLES as readonly string[]).includes(q.entity))
    query = query.eq("entity", q.entity);
  if (q.actor && /^[0-9a-f-]{36}$/.test(q.actor)) query = query.eq("actor_id", q.actor);
  if (q.from && /^\d{4}-\d{2}-\d{2}$/.test(q.from))
    query = query.gte("at", `${q.from}T00:00:00+06:00`);
  if (q.to && /^\d{4}-\d{2}-\d{2}$/.test(q.to)) query = query.lte("at", `${q.to}T23:59:59+06:00`);
  if (q.before && /^\d+$/.test(q.before)) query = query.lt("id", Number(q.before));

  const [{ data: rows }, { data: admins }] = await Promise.all([
    query,
    supabase
      .from("admin_permissions")
      .select("user_id, profile:profiles!admin_permissions_user_id_fkey(email, full_name)"),
  ]);
  const page = (rows ?? []).slice(0, PAGE);
  const hasOlder = (rows ?? []).length > PAGE;

  // Names for every actor on this page (admins, CRs, teachers, students).
  const actorIds = [...new Set(page.map((r) => r.actor_id).filter((x): x is string => Boolean(x)))];
  const { data: people } = actorIds.length
    ? await supabase.from("profiles").select("id, email, full_name").in("id", actorIds)
    : { data: [] };
  const nameOf = (id: string | null) => {
    if (!id) return tr("audit.system");
    const p = people?.find((x) => x.id === id);
    return p ? (p.full_name ?? p.email) : id.slice(0, 8);
  };

  const link = (extra: Partial<Search>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...q, ...extra })) if (v) params.set(k, v);
    return `/admin/audit?${params.toString()}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-display font-bold">{tr("audit.title")}</h1>

      <form className="flex flex-wrap items-end gap-3" action="/admin/audit">
        <label className="flex flex-col gap-1">
          <span className="font-body text-caption font-semibold uppercase text-text-muted">
            {tr("audit.entity")}
          </span>
          <select name="entity" defaultValue={q.entity ?? ""} className={inputClass}>
            <option value="">{tr("audit.all")}</option>
            {AUDITED_TABLES.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-body text-caption font-semibold uppercase text-text-muted">
            {tr("audit.actor")}
          </span>
          <select name="actor" defaultValue={q.actor ?? ""} className={inputClass}>
            <option value="">{tr("audit.all")}</option>
            {(admins ?? []).map((a) => (
              <option key={a.user_id} value={a.user_id}>
                {a.profile?.full_name ?? a.profile?.email}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-body text-caption font-semibold uppercase text-text-muted">
            {tr("audit.from")}
          </span>
          <input type="date" name="from" defaultValue={q.from} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-body text-caption font-semibold uppercase text-text-muted">
            {tr("audit.to")}
          </span>
          <input type="date" name="to" defaultValue={q.to} className={inputClass} />
        </label>
        <button
          type="submit"
          className="h-11 rounded-button bg-accent px-5 font-body text-small font-semibold text-on-accent hover:opacity-90"
        >
          {tr("audit.filter")}
        </button>
      </form>

      {page.length === 0 ? (
        <Card>
          <p className="font-body text-body text-text-muted">{tr("audit.empty")}</p>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-card border border-border">
          <div className="grid grid-cols-[180px_1fr_120px_180px_1fr] gap-3 border-b border-border bg-surface px-4 py-2 font-body text-small font-semibold text-text-muted">
            <span>{tr("audit.when")}</span>
            <span>{tr("audit.actor")}</span>
            <span>{tr("audit.action")}</span>
            <span>{tr("audit.entity")}</span>
            <span>{tr("audit.record")}</span>
          </div>
          {page.map((r) => {
            const changes = changedFields(r.before, r.after);
            const action = (["insert", "update", "delete"] as const).find((a) => a === r.action);
            return (
              <details key={r.id} className="group border-b border-border last:border-b-0">
                <summary className="grid cursor-pointer list-none grid-cols-[180px_1fr_120px_180px_1fr] items-center gap-3 px-4 py-3 font-body text-small hover:bg-surface [&::-webkit-details-marker]:hidden">
                  <span className="text-text-muted">{formatDateTime(r.at, locale)}</span>
                  <span className="truncate font-semibold">{nameOf(r.actor_id)}</span>
                  <span>
                    <Pill
                      size="sm"
                      tone={action ? actionTone[action] : "neutral"}
                      label={action ? tr(`audit.action.${action}` as MessageKey) : r.action}
                    />
                  </span>
                  <span className="font-mono">{r.entity}</span>
                  <span className="truncate font-mono text-text-muted">{r.entity_id}</span>
                </summary>
                <div className="bg-surface px-4 pb-4">
                  <table className="w-full border-collapse font-body text-small">
                    <thead>
                      <tr className="text-left text-text-muted">
                        <th className="w-48 py-2 pr-3 font-semibold">{tr("audit.field")}</th>
                        <th className="py-2 pr-3 font-semibold">{tr("audit.before")}</th>
                        <th className="py-2 font-semibold">{tr("audit.after")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {changes.map((c) => (
                        <tr key={c.field} className="border-t border-border align-top">
                          <td className="py-2 pr-3 font-mono">{c.field}</td>
                          <td className="break-all py-2 pr-3 font-mono text-danger">
                            {showValue(c.before)}
                          </td>
                          <td className="break-all py-2 font-mono text-accent">
                            {showValue(c.after)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            );
          })}
        </div>
      )}

      <div className="flex justify-between">
        {q.before ? (
          <Link
            href={link({ before: undefined })}
            className="font-body text-small font-semibold text-accent"
          >
            ← {tr("audit.newer")}
          </Link>
        ) : (
          <span />
        )}
        {hasOlder ? (
          <Link
            href={link({ before: String(page[page.length - 1]?.id ?? "") })}
            className="font-body text-small font-semibold text-accent"
          >
            {tr("audit.older")} →
          </Link>
        ) : null}
      </div>
    </div>
  );
}
