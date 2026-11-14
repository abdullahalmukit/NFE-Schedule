import Link from "next/link";
import { fill, hasArea, type MessageKey } from "@nfe/core";
import { Card, Panel, Pill } from "@nfe/ui/web";
import { formatDateTime, getAdminContext } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "../_components/action-form";
import { Hidden } from "../_components/fields";
import { discardDraft } from "./actions";

const STATUS_TONE = { draft: "warning", published: "accent", archived: "neutral" } as const;

/** A-1 Routine home: versions and "Upload new routine" (publish and history arrive with routine-publish). */
export default async function RoutineHomePage() {
  const { access, tr, locale } = await getAdminContext();
  if (!hasArea(access, "routine")) {
    return (
      <Card>
        <p className="font-body text-body text-text-muted">
          {fill(tr("md.noArea"), { area: tr("admin.area.routine") })}
        </p>
      </Card>
    );
  }
  const supabase = await createClient();
  const [{ data: versions }, { data: semesters }, { data: pending }] = await Promise.all([
    supabase
      .from("routine_versions")
      .select("id, semester_id, label, status, source, created_at, published_at")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("semesters").select("id, name").is("deleted_at", null),
    supabase
      .from("import_runs")
      .select("id, file_name, version_label, created_at")
      .eq("kind", "routine")
      .eq("status", "parsed")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  const semesterName = (id: string) => semesters?.find((s) => s.id === id)?.name ?? "";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-display font-bold">{tr("admin.nav.routine")}</h1>
        <Link
          href="/admin/routine/import"
          className="inline-flex h-10 items-center rounded-button bg-accent px-4 font-body text-small font-semibold text-on-accent hover:opacity-90"
        >
          {tr("rth.upload")}
        </Link>
      </div>

      {pending?.length ? (
        <Panel title={tr("rth.pending")}>
          <ul className="flex flex-col">
            {pending.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-3 border-b border-border py-2 last:border-b-0"
              >
                <span className="grow font-body text-small text-text">
                  {p.file_name} · {p.version_label} · {formatDateTime(p.created_at, locale)}
                </span>
                <Link
                  href={`/admin/routine/import?run=${p.id}`}
                  className="font-body text-small font-semibold text-accent"
                >
                  {tr("rth.continue")}
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <Panel title={tr("rth.versions")} description={tr("rth.draftNote")}>
        {versions?.length ? (
          <table className="w-full border-collapse font-body text-small">
            <thead>
              <tr className="border-b border-border text-left text-text-muted">
                <th className="py-2 pr-3 font-semibold">{tr("rth.col.version")}</th>
                <th className="py-2 pr-3 font-semibold">{tr("rth.col.semester")}</th>
                <th className="py-2 pr-3 font-semibold">{tr("rth.col.status")}</th>
                <th className="py-2 pr-3 font-semibold">{tr("rth.col.source")}</th>
                <th className="py-2 pr-3 font-semibold">{tr("rth.col.created")}</th>
                <th className="py-2 pr-3 font-semibold">{tr("rth.col.published")}</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.id} className="border-b border-border last:border-b-0">
                  <td className="py-2 pr-3 font-semibold">{v.label}</td>
                  <td className="py-2 pr-3">{semesterName(v.semester_id)}</td>
                  <td className="py-2 pr-3">
                    <Pill
                      size="sm"
                      tone={STATUS_TONE[v.status]}
                      label={tr(`rth.status.${v.status}` as MessageKey)}
                    />
                  </td>
                  <td className="py-2 pr-3">{tr(`rth.source.${v.source}` as MessageKey)}</td>
                  <td className="py-2 pr-3">{formatDateTime(v.created_at, locale)}</td>
                  <td className="py-2 pr-3">
                    {v.published_at ? formatDateTime(v.published_at, locale) : "—"}
                  </td>
                  <td className="py-2 text-right">
                    {v.status === "draft" ? (
                      <ActionForm
                        action={discardDraft}
                        submitLabel={tr("rth.discard")}
                        variant="danger"
                      >
                        <Hidden name="id" value={v.id} />
                      </ActionForm>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="font-body text-body text-text-muted">{tr("rth.none")}</p>
        )}
      </Panel>
    </div>
  );
}
