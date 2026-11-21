import Link from "next/link";
import { notFound } from "next/navigation";
import { fill, hasArea, sectionKey } from "@nfe/core";
import { Card, Panel, StatCard } from "@nfe/ui/web";
import { getAdminContext } from "@/lib/admin";
import { clashReport } from "@/lib/routine-editor";
import { publishPlan } from "@/lib/routine-publish";
import { loadSlots, loadVersion } from "@/lib/routine-versions";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "../../../../_components/action-form";
import { Hidden } from "../../../../_components/fields";
import { ChangeList } from "../../../_components/change-list";
import { publishVersion } from "../../../actions";

/**
 * A-3 Publish dialog (ADM-RT-3, ADM-RT-4): changes against the version in
 * effect grouped by section, effective date, notify switch, summary text,
 * affected student count and the batches to graduate.
 */
export default async function PublishPage({ params }: { params: Promise<{ id: string }> }) {
  const { access, tr } = await getAdminContext();
  if (!hasArea(access, "routine")) {
    return (
      <Card>
        <p className="font-body text-body text-text-muted">
          {fill(tr("md.noArea"), { area: tr("admin.area.routine") })}
        </p>
      </Card>
    );
  }
  const { id } = await params;
  const supabase = await createClient();
  const version = await loadVersion(supabase, id);
  if (!version) notFound();
  const back = `/admin/routine/versions/${id}`;
  if (version.status !== "draft") {
    return (
      <Card>
        <p className="font-body text-body text-text">
          {tr("rtp.err.notDraft")}{" "}
          <Link href={back} className="font-semibold text-accent">
            {tr("rtp.open")}
          </Link>
        </p>
      </Card>
    );
  }
  const [plan, slots] = await Promise.all([
    publishPlan(supabase, version),
    loadSlots(supabase, version.semester_id),
  ]);
  const { data: students } = await supabase.rpc("count_affected_students", {
    p_sections: plan.sectionIds,
    p_lab_groups: plan.labGroupIds,
  });
  const clashes = clashReport(plan.after, slots, tr).messages;
  const count = (k: string) => plan.changes.filter((c) => c.kind === k).length;
  const sections = new Set(plan.changes.map((c) => sectionKey((c.after ?? c.before)!))).size;
  const today = new Date().toISOString().slice(0, 10);
  const summary = plan.base
    ? fill(tr("rtp.summaryDefault"), { n: plan.changes.length })
    : tr("rtp.summaryFirst");
  const field =
    "rounded-xl border border-border bg-surface px-3 font-body text-small text-text outline-none focus:border-accent";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={back} className="font-body text-small font-semibold text-accent">
          ← {fill(tr("rtv.back"), { label: version.label })}
        </Link>
        <h1 className="mt-1 font-display text-display font-bold">
          {fill(tr("rtp.title"), { label: version.label })}
        </h1>
        <p className="font-body text-small text-text-muted">
          {plan.base
            ? fill(tr("rtp.against"), { label: plan.base.label })
            : fill(tr("rtp.first"), { n: plan.after.length })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard value={String(count("added"))} label={tr("rtp.kind.added")} />
        <StatCard value={String(count("removed"))} label={tr("rtp.kind.removed")} />
        <StatCard value={String(count("moved"))} label={tr("rtp.kind.moved")} />
        <StatCard value={String(count("changed"))} label={tr("rtp.kind.changed")} />
        <StatCard
          value={String(students ?? 0)}
          label={fill(tr("rtp.students"), { s: sections })}
          highlight
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <Panel title={tr("rtp.changes")}>
          {plan.base ? (
            <ChangeList changes={plan.changes} slots={slots} tr={tr} />
          ) : (
            <p className="font-body text-body text-text-muted">
              {fill(tr("rtp.first"), { n: plan.after.length })}
            </p>
          )}
        </Panel>

        <Panel title={tr("rtp.publish")}>
          <ActionForm action={publishVersion} submitLabel={tr("rtp.publishButton")}>
            <Hidden name="id" value={version.id} />
            <label className="flex flex-col gap-1">
              <span className="font-body text-caption font-semibold text-text-muted">
                {tr("rtp.effective")}
              </span>
              <input
                type="date"
                name="effective_from"
                min={today}
                defaultValue={today}
                required
                className={`h-10 ${field}`}
              />
              <span className="font-body text-caption text-text-faint">
                {tr("rtp.effectiveHelp")}
              </span>
            </label>
            <label className="flex items-center gap-2 font-body text-small text-text">
              <input
                type="checkbox"
                name="notify"
                defaultChecked
                className="h-4 w-4 accent-accent"
              />
              {tr("rtp.notify")}
            </label>
            <p className="-mt-2 font-body text-caption text-text-faint">{tr("rtp.notifyHelp")}</p>
            <label className="flex flex-col gap-1">
              <span className="font-body text-caption font-semibold text-text-muted">
                {tr("rtp.summary")}
              </span>
              <textarea
                name="summary"
                maxLength={500}
                defaultValue={summary}
                className={`h-24 py-2 ${field}`}
              />
            </label>
            {clashes.length ? (
              <div className="flex flex-col gap-2 rounded-xl border border-danger p-3">
                <p className="font-body text-small font-semibold text-danger">
                  {fill(tr("rte.clashCount"), { n: clashes.length })}
                </p>
                <ul className="flex flex-col gap-1">
                  {clashes.slice(0, 10).map((m) => (
                    <li key={m} className="font-body text-caption text-danger">
                      {m}
                    </li>
                  ))}
                </ul>
                <label className="flex items-center gap-2 font-body text-small text-text">
                  <input type="checkbox" name="anyway" className="h-4 w-4 accent-accent" />
                  {tr("rte.publishAnyway")}
                </label>
              </div>
            ) : null}
            {plan.graduate.length ? (
              <fieldset className="flex flex-col gap-1">
                <legend className="font-body text-caption font-semibold text-text-muted">
                  {tr("rtp.graduate")}
                </legend>
                {plan.graduate.map((b) => (
                  <label key={b} className="flex items-center gap-2 font-body text-small text-text">
                    <input
                      type="checkbox"
                      name="graduate"
                      value={b}
                      defaultChecked
                      className="h-4 w-4 accent-accent"
                    />
                    {fill(tr("rtp.graduateBatch"), { b })}
                  </label>
                ))}
              </fieldset>
            ) : null}
          </ActionForm>
        </Panel>
      </div>
    </div>
  );
}
