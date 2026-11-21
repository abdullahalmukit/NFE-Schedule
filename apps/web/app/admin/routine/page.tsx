import Link from "next/link";
import { fill, hasArea, nextLabel, type MessageKey } from "@nfe/core";
import { Card, Panel, Pill } from "@nfe/ui/web";
import { formatDate, formatDateTime, getAdminContext } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "../_components/action-form";
import { Hidden, inputClass, SelectField, TextField } from "../_components/fields";
import { discardDraft, restoreVersion } from "./actions";
import { startEditing, startFromScratch } from "./editor-actions";

const STATUS_TONE = { draft: "warning", published: "accent", archived: "neutral" } as const;

/** A-1 Routine home: versions (open, publish a draft, restore), compare, "Upload new routine" (ADM-RT-7). */
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
      .select("id, semester_id, label, status, source, created_at, published_at, effective_from")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("semesters").select("id, name, is_active").is("deleted_at", null),
    supabase
      .from("import_runs")
      .select("id, file_name, version_label, created_at")
      .eq("kind", "routine")
      .eq("status", "parsed")
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  const semesterName = (id: string) => semesters?.find((s) => s.id === id)?.name ?? "";
  const labels = (semesterId: string) =>
    (versions ?? []).filter((v) => v.semester_id === semesterId).map((v) => v.label);
  const activeSemester = semesters?.find((s) => s.is_active) ?? null;
  const hasDraft = (semesterId: string) =>
    (versions ?? []).some((v) => v.semester_id === semesterId && v.status === "draft");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-display font-bold">{tr("admin.nav.routine")}</h1>
        <div className="flex flex-wrap items-center gap-3">
          {activeSemester ? (
            <ActionForm
              action={startEditing}
              submitLabel={tr("rte.editCurrent")}
              variant="secondary"
            >
              <Hidden name="semester_id" value={activeSemester.id} />
            </ActionForm>
          ) : null}
          <Link
            href="/admin/routine/import"
            className="inline-flex h-10 items-center rounded-button bg-accent px-4 font-body text-small font-semibold text-on-accent hover:opacity-90"
          >
            {tr("rth.upload")}
          </Link>
        </div>
      </div>

      {semesters?.length ? (
        <details className="rounded-card bg-surface p-5 shadow-card">
          <summary className="cursor-pointer font-display text-heading font-bold text-text">
            {tr("rte.scratch")}
          </summary>
          <p className="mt-1 font-body text-small text-text-muted">{tr("rte.scratchHelp")}</p>
          <ActionForm
            action={startFromScratch}
            submitLabel={tr("rte.scratchButton")}
            className="mt-4 max-w-md"
          >
            <div className="grid grid-cols-2 gap-3">
              <SelectField
                name="semester_id"
                label={tr("rti.semester")}
                defaultValue={activeSemester?.id}
                options={semesters.map((s) => ({ value: s.id, label: s.name }))}
              />
              <TextField name="label" label={tr("rti.label")} placeholder="1" required />
            </div>
          </ActionForm>
        </details>
      ) : null}

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

      {versions && versions.length > 1 ? (
        <Panel title={tr("rth.compare")}>
          <form action="/admin/routine/compare" className="flex flex-wrap items-end gap-3">
            {(["a", "b"] as const).map((k, i) => (
              <label key={k} className="flex flex-col gap-1">
                <span className="font-body text-caption font-semibold text-text-muted">
                  {tr(k === "a" ? "rth.compareFrom" : "rth.compareTo")}
                </span>
                <select
                  name={k}
                  defaultValue={versions[i === 0 ? 1 : 0]!.id}
                  className={`${inputClass} w-48`}
                >
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.label} · {semesterName(v.semester_id)}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <button
              type="submit"
              className="h-10 rounded-button border border-border px-4 font-body text-small font-semibold text-text hover:bg-surface-raised"
            >
              {tr("rth.compareButton")}
            </button>
          </form>
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
                <th className="py-2 pr-3 font-semibold">{tr("rth.col.effective")}</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.id} className="border-b border-border last:border-b-0">
                  <td className="py-2 pr-3 font-semibold">
                    <Link
                      href={`/admin/routine/versions/${v.id}`}
                      className="text-accent hover:underline"
                    >
                      {v.label}
                    </Link>
                  </td>
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
                  <td className="py-2 pr-3">
                    {v.effective_from ? formatDate(v.effective_from, locale) : "—"}
                  </td>
                  <td className="py-2 text-right">
                    {v.status === "draft" ? (
                      <div className="flex flex-col items-end gap-2">
                        <Link
                          href={`/admin/routine/versions/${v.id}/publish`}
                          className="font-semibold text-accent hover:underline"
                        >
                          {tr("rtv.preview")}
                        </Link>
                        <ActionForm
                          action={discardDraft}
                          submitLabel={tr("rth.discard")}
                          variant="danger"
                        >
                          <Hidden name="id" value={v.id} />
                        </ActionForm>
                      </div>
                    ) : hasDraft(v.semester_id) ? null : (
                      <ActionForm
                        action={restoreVersion}
                        submitLabel={tr("rth.restore")}
                        variant="secondary"
                      >
                        <Hidden name="id" value={v.id} />
                        <input
                          name="label"
                          aria-label={tr("rti.label")}
                          defaultValue={nextLabel(v.label, labels(v.semester_id))}
                          maxLength={20}
                          className={`${inputClass} h-9 w-24`}
                        />
                      </ActionForm>
                    )}
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
