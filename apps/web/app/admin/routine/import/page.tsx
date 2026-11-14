import Link from "next/link";
import { fill, hasArea, type MessageKey, type RoutineReview } from "@nfe/core";
import { Card, cx, Panel, Pill, StatCard, Stepper } from "@nfe/ui/web";
import { getAdminContext } from "@/lib/admin";
import { describeIssue, loadRoutineRun, reviewRun, type RoutineRun } from "@/lib/routine-import";
import { createClient } from "@/lib/supabase/server";
import { DecisionButton } from "./decision-button";
import { DetailsEditor } from "./details-editor";
import { GraduateToggle } from "./graduate-toggle";
import { SaveDraft } from "./save-draft";
import { UploadForm } from "./upload-form";

type Tr = Awaited<ReturnType<typeof getAdminContext>>["tr"];

/** Mockup 8 — Upload → Read tables → Fill missing details → Publish (ADM-RT-1, ADM-RT-2, ADM-RT-10). */
export default async function RoutineImportPage({
  searchParams,
}: {
  searchParams: Promise<{ run?: string }>;
}) {
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
  const steps = [
    tr("rti.step.upload"),
    tr("rti.step.read"),
    tr("rti.step.fill"),
    tr("rti.step.publish"),
  ];
  const { run: runId } = await searchParams;
  const supabase = await createClient();
  const run = runId ? await loadRoutineRun(supabase, runId) : null;

  if (!run) {
    const { data: semesters } = await supabase
      .from("semesters")
      .select("id, name, is_active")
      .is("deleted_at", null)
      .order("starts_on", { ascending: false });
    return (
      <div className="flex flex-col gap-6">
        <Header tr={tr} title={tr("rti.title")} />
        <Stepper steps={steps} current={0} />
        <Panel title={tr("rti.step.upload")}>
          {semesters?.length ? (
            <UploadForm
              semesters={semesters}
              defaultSemester={semesters.find((s) => s.is_active)?.id ?? semesters[0]!.id}
              labels={{
                semester: tr("rti.semester"),
                label: tr("rti.label"),
                labelHelp: tr("rti.labelHelp"),
                file: tr("rti.file"),
                read: tr("rti.read"),
                reading: tr("rti.reading"),
                docx: tr("rti.err.docx"),
                tooBig: tr("imp.upload.tooBig"),
                upload: tr("imp.err.upload"),
                generic: tr("imp.err.generic"),
              }}
            />
          ) : (
            <p className="font-body text-body text-text-muted">
              {tr("rti.noSemester")}{" "}
              <Link href="/admin/settings/semesters" className="font-semibold text-accent">
                {tr("setp.semesters")}
              </Link>
            </p>
          )}
        </Panel>
      </div>
    );
  }

  const [{ review }, { data: semester }] = await Promise.all([
    reviewRun(run),
    supabase.from("semesters").select("name").eq("id", run.semesterId).maybeSingle(),
  ]);
  const open = run.status === "parsed";
  const generic = tr("imp.err.generic");
  const title = fill(tr("rti.reviewTitle"), { semester: semester?.name ?? "", label: run.label });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <Header tr={tr} title={title} sub={run.fileName} />
        {open ? (
          <div className="flex flex-wrap items-center gap-3">
            <DecisionButton
              path="cancel"
              body={{ runId: run.id }}
              label={tr("rti.cancel")}
              then="/admin/routine"
              generic={generic}
            />
            <SaveDraft
              runId={run.id}
              label={run.label}
              disabled={review.blockers.length > 0}
              labels={{
                save: tr("rti.save"),
                saved: tr("rti.saved"),
                backHome: tr("rti.backHome"),
                generic,
              }}
            />
          </div>
        ) : null}
      </div>
      <Stepper steps={steps} current={open ? 2 : 3} />

      {!open ? (
        <Card>
          <p className="font-body text-body text-text">
            {tr(run.status === "applied" ? "rti.applied" : "rti.cancelledNote")}{" "}
            <Link href="/admin/routine" className="font-semibold text-accent">
              {tr("rti.backHome")}
            </Link>
          </p>
        </Card>
      ) : null}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard value={String(review.stats.tables)} label={tr("rti.stat.tables")} />
        <StatCard value={String(review.stats.classes)} label={tr("rti.stat.classes")} />
        <StatCard value={String(review.stats.labSessions)} label={tr("rti.stat.labs")} />
        <StatCard
          value={String(review.stats.clashes)}
          label={tr("rti.stat.clashes")}
          highlight={review.stats.clashes === 0}
        />
      </div>

      {open && review.blockers.length ? (
        <ul className="flex flex-col gap-1 rounded-card border border-warning p-4">
          {review.blockers.map((b) => (
            <li key={b} className="font-body text-small font-semibold text-warning">
              {tr(`rti.blocker.${b}` as MessageKey)}
            </li>
          ))}
        </ul>
      ) : null}

      {review.errors.length ? (
        <Panel title={tr("rti.errors.title")} description={tr("rti.errors.help")}>
          <ul className="flex flex-col gap-1">
            {review.errors.slice(0, 50).map((e, i) => (
              <li key={i} className="font-body text-small text-danger">
                {describeIssue(tr, run.parsed, e, "rti.issue")}
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      {review.warnings.length ? <Warnings tr={tr} run={run} review={review} open={open} /> : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-6">
          <Panel
            title={tr("rti.faculty.title")}
            description={tr("rti.faculty.help")}
            aside={
              <Pill
                tone="warning"
                label={fill(tr("rti.toComplete"), { n: review.faculty.length })}
              />
            }
          >
            <DetailsEditor
              kind="faculty"
              runId={run.id}
              columns={[
                tr("rti.col.initial"),
                tr("rti.col.classes"),
                tr("rti.col.fullName"),
                tr("rti.col.designation"),
              ]}
              rows={review.faculty.map((f) => ({
                key: f.initial,
                department: f.department,
                info: String(f.classesPerWeek),
                note: f.guest ? fill(tr("rti.guest"), { dept: f.department ?? "" }) : undefined,
                isNew: f.isNew,
              }))}
              labels={detailLabels(tr)}
            />
            <TemplateLink href="/admin/faculty/import" label={tr("rti.templateLink")} />
          </Panel>
          <Panel
            title={tr("rti.courses.title")}
            aside={
              <Pill
                tone="warning"
                label={fill(tr("rti.toComplete"), { n: review.courses.length })}
              />
            }
          >
            <DetailsEditor
              kind="courses"
              runId={run.id}
              columns={[
                tr("rti.col.code"),
                tr("rti.col.type"),
                tr("rti.col.title"),
                tr("rti.col.credit"),
              ]}
              rows={review.courses.map((c) => ({
                key: c.code,
                info: tr(c.detectedType === "lab" ? "rti.type.lab" : "rti.type.theory"),
                note: c.prefix ? tr("rti.prefixed") : undefined,
                isNew: c.isNew,
                type: c.detectedType,
              }))}
              labels={detailLabels(tr)}
            />
            <TemplateLink href="/admin/courses/import" label={tr("rti.templateLink")} />
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel
            title={tr("rti.batches.title")}
            description={
              review.batches.every((b) => b.tag === "new")
                ? fill(tr("rti.batches.helpFirst"), { n: review.batches.length })
                : tr("rti.batches.help")
            }
          >
            <ul className="flex flex-col">
              {review.batches.map((b) => (
                <li
                  key={b.code}
                  className="flex flex-wrap items-center gap-3 border-b border-border py-2 last:border-b-0"
                >
                  <span className="font-display text-heading font-bold">{b.code}</span>
                  <span className="grow font-body text-small text-text-muted">
                    {fill(tr("rti.batches.summary"), { s: b.sections, g: b.labGroups })}
                  </span>
                  {b.tag ? (
                    <Pill
                      size="sm"
                      tone={b.tag === "new" ? "accent" : "warning"}
                      label={tr(b.tag === "new" ? "rti.tag.new" : "rti.tag.graduating")}
                    />
                  ) : null}
                  {b.tag === "graduating" && open ? (
                    <span className="basis-full">
                      <GraduateToggle
                        runId={run.id}
                        batch={b.code}
                        on={run.overrides.graduate.includes(b.code)}
                        label={tr("rti.graduate")}
                      />
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title={tr("rti.checks.title")}>
            <dl className="flex flex-col">
              {(
                [
                  ["rti.check.teacher", review.stats.teacherClashes, true],
                  ["rti.check.room", review.stats.roomClashes, true],
                  ["rti.check.unreadable", review.stats.unreadable, true],
                  ["rti.check.rooms", review.stats.roomsFound, false],
                ] as const
              ).map(([key, n, problem]) => (
                <div
                  key={key}
                  className="flex justify-between border-b border-border py-2 last:border-b-0"
                >
                  <dt className="font-body text-small text-text">{tr(key)}</dt>
                  <dd
                    className={cx(
                      "font-body text-small font-semibold",
                      problem ? (n ? "text-danger" : "text-accent") : "text-text",
                    )}
                  >
                    {problem && n === 0 ? tr("rti.none") : n}
                  </dd>
                </div>
              ))}
            </dl>
          </Panel>

          <TimeSlots tr={tr} run={run} review={review} open={open} />

          {review.suggestions.length ? (
            <Panel title={tr("rti.suggest.title")} description={tr("rti.suggest.help")}>
              <ul className="flex flex-col gap-2">
                {review.suggestions
                  .filter((s) => s.kind !== "timeSlots" && s.kind !== "newCourse")
                  .map((s) => (
                    <li key={`${s.kind}:${s.subject}`} className="font-body text-small text-text">
                      {fill(tr(`rti.suggest.${s.kind}` as MessageKey), { s: s.subject })}
                    </li>
                  ))}
              </ul>
              <p className="mt-3 font-body text-small text-text-muted">
                {fill(tr("rti.newItems"), {
                  batches: review.newItems.batches.length,
                  sections: review.newItems.sections.length,
                  groups: review.newItems.labGroups.length,
                  rooms: review.newItems.rooms.length,
                  courses: review.courses.filter((c) => c.isNew).length,
                  teachers: review.faculty.filter((f) => f.isNew).length,
                })}
              </p>
            </Panel>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Header({ tr, title, sub }: { tr: Tr; title: string; sub?: string }) {
  return (
    <div>
      <Link href="/admin/routine" className="font-body text-small font-semibold text-accent">
        ← {tr("admin.nav.routine")}
      </Link>
      <h1 className="mt-1 font-display text-display font-bold">{title}</h1>
      {sub ? <p className="font-body text-small text-text-muted">{sub}</p> : null}
    </div>
  );
}

function TemplateLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="mt-2 inline-block font-body text-small font-semibold text-accent">
      {label} →
    </Link>
  );
}

function detailLabels(tr: Tr) {
  return {
    new: tr("rti.new"),
    showAll: tr("rti.showAll"),
    showLess: tr("rti.showLess"),
    save: tr("rti.saveDetails"),
    saved: tr("rti.detailsSaved"),
    generic: tr("imp.err.generic"),
  };
}

function Warnings({
  tr,
  run,
  review,
  open,
}: {
  tr: Tr;
  run: RoutineRun;
  review: RoutineReview;
  open: boolean;
}) {
  const generic = tr("imp.err.generic");
  const groupTables = [
    ...new Set(review.warnings.map((w) => w.labGroupTable).filter((t): t is string => !!t)),
  ];
  const others = review.warnings.filter((w) => !w.labGroupTable);
  return (
    <Panel title={tr("rti.warnings.title")} description={tr("rti.warnings.help")}>
      <div className="flex flex-col gap-4">
        {groupTables.map((table) => {
          const items = review.warnings.filter((w) => w.labGroupTable === table);
          const written = [
            ...new Set(
              run.parsed.classes
                .filter(
                  (c) =>
                    `${c.batch}-${c.section}` === table &&
                    c.labGroup &&
                    c.sectionLabel !== c.section,
                )
                .map((c) => c.labGroup!),
            ),
          ].sort();
          const section = table.split("-")[1] ?? "";
          const renamed = written.map((g) => section + g.slice(1));
          const isRenamed = run.overrides.renameLabGroups.includes(table);
          const decided = items.every((w) => w.done);
          return (
            <div key={table} className="rounded-xl border border-border p-3">
              <ul className="flex flex-col gap-1">
                {items.map((w) => (
                  <li key={w.id} className="font-body text-small text-text">
                    {describeIssue(tr, run.parsed, w, "rti.warn")}
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {decided ? (
                  <Pill
                    size="sm"
                    tone="accent"
                    label={fill(tr(isRenamed ? "rti.renameGroups" : "rti.keepGroups"), {
                      groups: (isRenamed ? renamed : written).join(", "),
                    })}
                  />
                ) : null}
                {open ? (
                  <>
                    <DecisionButton
                      path="decide"
                      body={{ runId: run.id, action: { kind: "labGroups", table, rename: false } }}
                      label={fill(tr("rti.keepGroups"), { groups: written.join(", ") })}
                      variant={decided && !isRenamed ? "primary" : "secondary"}
                      generic={generic}
                    />
                    <DecisionButton
                      path="decide"
                      body={{ runId: run.id, action: { kind: "labGroups", table, rename: true } }}
                      label={fill(tr("rti.renameGroups"), { groups: renamed.join(", ") })}
                      variant={isRenamed ? "primary" : "secondary"}
                      generic={generic}
                    />
                  </>
                ) : null}
              </div>
            </div>
          );
        })}
        {others.length ? (
          <ul className="flex flex-col">
            {others.map((w) => (
              <li
                key={w.id}
                className="flex flex-wrap items-center gap-3 border-b border-border py-2 last:border-b-0"
              >
                <span className="grow font-body text-small text-text">
                  {describeIssue(tr, run.parsed, w, "rti.warn")}
                </span>
                {w.done ? <Pill size="sm" tone="accent" label={tr("rti.accepted")} /> : null}
                {open ? (
                  <DecisionButton
                    path="decide"
                    body={{
                      runId: run.id,
                      action: { kind: w.done ? "unaccept" : "accept", ids: [w.id] },
                    }}
                    label={tr(w.done ? "rti.undo" : "rti.accept")}
                    variant={w.done ? "link" : "secondary"}
                    generic={generic}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Panel>
  );
}

function TimeSlots({
  tr,
  run,
  review,
  open,
}: {
  tr: Tr;
  run: RoutineRun;
  review: RoutineReview;
  open: boolean;
}) {
  const { status, file } = review.timeSlots;
  return (
    <Panel title={tr("rti.slots.title")}>
      <p className="font-body text-small text-text">
        {file.map((s) => `${s.start}–${s.end}`).join(" · ")}
      </p>
      <p className="mt-2 font-body text-small text-text-muted">
        {status === "create"
          ? tr("rti.slots.create")
          : status === "same"
            ? tr("rti.slots.same")
            : tr("rti.suggest.timeSlots")}
      </p>
      {status === "differs" && open ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {(["keep", "update"] as const).map((v) => (
            <DecisionButton
              key={v}
              path="decide"
              body={{ runId: run.id, action: { kind: "timeSlots", value: v } }}
              label={tr(v === "keep" ? "rti.slots.keep" : "rti.slots.update")}
              variant={run.overrides.timeSlots === v ? "primary" : "secondary"}
              generic={tr("imp.err.generic")}
            />
          ))}
        </div>
      ) : null}
    </Panel>
  );
}
