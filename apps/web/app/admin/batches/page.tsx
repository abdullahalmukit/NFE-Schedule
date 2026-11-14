import Link from "next/link";
import { fill, hasArea } from "@nfe/core";
import { Card, cx, Panel, Pill } from "@nfe/ui/web";
import { getAdminContext } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "../_components/action-form";
import { Hidden, TextField } from "../_components/fields";
import {
  saveBatch,
  saveLabGroup,
  saveSection,
  setBatchArchived,
  setBatchStatus,
  setGroupStatus,
} from "./actions";

/** A-8 Batches with their sections and lab groups (ADM-MD-4). */
export default async function BatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string; edit?: string }>;
}) {
  const { access, tr } = await getAdminContext();
  if (!hasArea(access, "batches")) {
    return (
      <Card>
        <p className="font-body text-body text-text-muted">
          {fill(tr("md.noArea"), { area: tr("admin.area.batches") })}
        </p>
      </Card>
    );
  }
  const { archived, edit } = await searchParams;
  const showArchived = archived === "1";
  const supabase = await createClient();
  const [{ data: batches }, { data: sections }, { data: labs }] = await Promise.all([
    supabase
      .from("batches")
      .select("id, code, intake_semester, status, deleted_at")
      .order("code", { ascending: false }),
    supabase
      .from("sections")
      .select("id, batch_id, name, status")
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("lab_groups")
      .select("id, section_id, name, status")
      .is("deleted_at", null)
      .order("name"),
  ]);
  const shownBatches = (batches ?? []).filter((b) => showArchived || !b.deleted_at);
  const visible = (status: string) => showArchived || status !== "archived";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-display font-bold">{tr("admin.nav.batches")}</h1>
        <Link
          href={showArchived ? "/admin/batches" : "/admin/batches?archived=1"}
          className="font-body text-small font-semibold text-accent"
        >
          {showArchived ? "✓ " : ""}
          {tr("md.showArchived")}
        </Link>
      </div>

      <Panel title={tr("batch.new")}>
        <ActionForm
          action={saveBatch}
          submitLabel={tr("md.add")}
          resetOnSuccess
          className="sm:flex-row sm:items-end"
        >
          <div className="grid flex-1 grid-cols-2 gap-3">
            <TextField name="code" label={tr("batch.code")} required placeholder="263" />
            <TextField
              name="intake_semester"
              label={tr("batch.intake")}
              placeholder="Spring 2026"
            />
          </div>
        </ActionForm>
      </Panel>

      {shownBatches.length === 0 ? (
        <Card>
          <p className="font-body text-body text-text-muted">{tr("batch.none")}</p>
        </Card>
      ) : null}

      {shownBatches.map((b) => {
        const own = (sections ?? []).filter((s) => s.batch_id === b.id && visible(s.status));
        const editing = edit === b.id;
        return (
          <Panel
            key={b.id}
            title={b.code}
            description={b.intake_semester ?? undefined}
            aside={
              <div className="flex flex-wrap items-center gap-2">
                <Pill
                  size="sm"
                  tone={b.status === "graduated" ? "info" : "accent"}
                  label={tr(
                    b.status === "graduated" ? "batch.status.graduated" : "batch.status.active",
                  )}
                />
                {b.deleted_at ? <Pill size="sm" label={tr("status.archived")} /> : null}
                <Link
                  href={editing ? "/admin/batches" : `/admin/batches?edit=${b.id}`}
                  className="font-body text-small font-semibold text-accent"
                >
                  {editing ? tr("md.cancel") : tr("md.edit")}
                </Link>
              </div>
            }
          >
            {editing ? (
              <div className="mb-5 flex flex-col gap-3 rounded-xl border border-border p-4">
                <ActionForm key={`b-${b.id}`} action={saveBatch} submitLabel={tr("md.save")}>
                  <Hidden name="id" value={b.id} />
                  <div className="grid grid-cols-2 gap-3">
                    <TextField
                      name="code"
                      label={tr("batch.code")}
                      required
                      defaultValue={b.code}
                    />
                    <TextField
                      name="intake_semester"
                      label={tr("batch.intake")}
                      defaultValue={b.intake_semester}
                    />
                  </div>
                </ActionForm>
                <div className="flex flex-wrap gap-3">
                  <ActionForm
                    key={`s-${b.id}-${b.status}`}
                    action={setBatchStatus}
                    submitLabel={
                      b.status === "graduated" ? tr("batch.reactivate") : tr("batch.graduate")
                    }
                    variant="secondary"
                  >
                    <Hidden name="id" value={b.id} />
                    <Hidden
                      name="status"
                      value={b.status === "graduated" ? "active" : "graduated"}
                    />
                  </ActionForm>
                  <ActionForm
                    key={`a-${b.id}-${Boolean(b.deleted_at)}`}
                    action={setBatchArchived}
                    submitLabel={b.deleted_at ? tr("md.restore") : tr("md.archive")}
                    variant={b.deleted_at ? "secondary" : "danger"}
                  >
                    <Hidden name="id" value={b.id} />
                    <Hidden name="archive" value={b.deleted_at ? "0" : "1"} />
                  </ActionForm>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col divide-y divide-border">
              {own.map((s) => {
                const ownLabs = (labs ?? []).filter(
                  (l) => l.section_id === s.id && visible(l.status),
                );
                return (
                  <div key={s.id} className="flex flex-col gap-3 py-4 first:pt-0">
                    <div className="flex flex-wrap items-end gap-3">
                      <span
                        className={cx(
                          "flex h-10 min-w-10 items-center justify-center rounded-chip bg-surface-raised px-3 font-body text-body font-semibold",
                          s.status === "archived" && "opacity-50",
                        )}
                      >
                        {b.code}-{s.name}
                      </span>
                      {editing ? (
                        <>
                          <ActionForm
                            key={`sec-${s.id}`}
                            action={saveSection}
                            submitLabel={tr("batch.rename")}
                            variant="secondary"
                            className="sm:flex-row sm:items-end"
                          >
                            <Hidden name="id" value={s.id} />
                            <Hidden name="batch_id" value={b.id} />
                            <TextField
                              name="name"
                              label={tr("batch.sectionName")}
                              required
                              defaultValue={s.name}
                              className="w-24"
                            />
                          </ActionForm>
                          <ActionForm
                            key={`sst-${s.id}-${s.status}`}
                            action={setGroupStatus}
                            submitLabel={
                              s.status === "archived" ? tr("md.restore") : tr("md.archive")
                            }
                            variant={s.status === "archived" ? "secondary" : "danger"}
                          >
                            <Hidden name="id" value={s.id} />
                            <Hidden name="table" value="sections" />
                            <Hidden
                              name="status"
                              value={s.status === "archived" ? "active" : "archived"}
                            />
                          </ActionForm>
                        </>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pl-2">
                      {ownLabs.map((l) =>
                        editing ? (
                          <div
                            key={l.id}
                            className="flex flex-wrap items-end gap-2 rounded-xl border border-border p-2"
                          >
                            <ActionForm
                              key={`lab-${l.id}`}
                              action={saveLabGroup}
                              submitLabel={tr("batch.rename")}
                              variant="secondary"
                              className="sm:flex-row sm:items-end"
                            >
                              <Hidden name="id" value={l.id} />
                              <Hidden name="section_id" value={s.id} />
                              <TextField
                                name="name"
                                label={tr("batch.labName")}
                                required
                                defaultValue={l.name}
                                className="w-24"
                              />
                            </ActionForm>
                            <ActionForm
                              key={`lst-${l.id}-${l.status}`}
                              action={setGroupStatus}
                              submitLabel={
                                l.status === "archived" ? tr("md.restore") : tr("md.archive")
                              }
                              variant={l.status === "archived" ? "secondary" : "danger"}
                            >
                              <Hidden name="id" value={l.id} />
                              <Hidden name="table" value="lab_groups" />
                              <Hidden
                                name="status"
                                value={l.status === "archived" ? "active" : "archived"}
                              />
                            </ActionForm>
                          </div>
                        ) : (
                          <Pill
                            key={l.id}
                            label={l.name}
                            tone={l.status === "archived" ? "neutral" : "info"}
                          />
                        ),
                      )}
                      {editing ? (
                        <ActionForm
                          key={`newlab-${s.id}`}
                          action={saveLabGroup}
                          submitLabel={tr("batch.addLab")}
                          resetOnSuccess
                          variant="secondary"
                          className="sm:flex-row sm:items-end"
                        >
                          <Hidden name="section_id" value={s.id} />
                          <TextField
                            name="name"
                            label={tr("batch.labName")}
                            required
                            placeholder={`${s.name}1`}
                            className="w-24"
                          />
                        </ActionForm>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            {editing ? (
              <div className="mt-4 border-t border-border pt-4">
                <ActionForm
                  key={`newsec-${b.id}`}
                  action={saveSection}
                  submitLabel={tr("batch.addSection")}
                  resetOnSuccess
                  className="sm:flex-row sm:items-end"
                >
                  <Hidden name="batch_id" value={b.id} />
                  <TextField
                    name="name"
                    label={tr("batch.sectionName")}
                    required
                    placeholder="A"
                    className="w-24"
                  />
                </ActionForm>
              </div>
            ) : null}
          </Panel>
        );
      })}
    </div>
  );
}
