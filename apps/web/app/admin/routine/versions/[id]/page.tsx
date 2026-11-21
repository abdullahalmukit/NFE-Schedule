import Link from "next/link";
import { notFound } from "next/navigation";
import { fill, hasArea, sectionKey, type MessageKey } from "@nfe/core";
import { Card, cx, Panel, Pill } from "@nfe/ui/web";
import { formatDate, getAdminContext } from "@/lib/admin";
import { loadSlots, loadVersion, loadVersionClasses } from "@/lib/routine-versions";
import { createClient } from "@/lib/supabase/server";
import { VersionGrid } from "../../_components/version-grid";

const STATUS_TONE = { draft: "warning", published: "accent", archived: "neutral" } as const;

/** Any version read-only, one section at a time (ADM-RT-7); a draft links to its publish page. */
export default async function VersionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ batch?: string; section?: string; published?: string }>;
}) {
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
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const version = await loadVersion(supabase, id);
  if (!version) notFound();
  const [classes, slots, { data: semester }, { data: home }] = await Promise.all([
    loadVersionClasses(supabase, id),
    loadSlots(supabase, version.semester_id),
    supabase.from("semesters").select("name").eq("id", version.semester_id).maybeSingle(),
    supabase.from("departments").select("code").eq("is_home", true).maybeSingle(),
  ]);

  const batches = [...new Set(classes.map((c) => c.batch))].sort((a, b) =>
    b.localeCompare(a, undefined, { numeric: true }),
  );
  const batch = batches.includes(sp.batch ?? "") ? sp.batch! : (batches[0] ?? "");
  const sections = [
    ...new Set(classes.filter((c) => c.batch === batch).map((c) => c.section)),
  ].sort();
  const section = sections.includes(sp.section ?? "") ? sp.section! : (sections[0] ?? "");
  const shown = classes.filter((c) => c.batch === batch && c.section === section);
  const days = [0, 1, 2, 3, 4, 5, 6].filter((d) => d < 6 || classes.some((c) => c.day === d));
  const base = `/admin/routine/versions/${id}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/admin/routine" className="font-body text-small font-semibold text-accent">
            ← {tr("admin.nav.routine")}
          </Link>
          <h1 className="mt-1 flex items-center gap-3 font-display text-display font-bold">
            {fill(tr("rtv.title"), { label: version.label, semester: semester?.name ?? "" })}
            <Pill
              tone={STATUS_TONE[version.status]}
              label={tr(`rth.status.${version.status}` as MessageKey)}
            />
          </h1>
          <p className="font-body text-small text-text-muted">
            {fill(tr("rtv.summary"), {
              classes: classes.length,
              sections: new Set(classes.map(sectionKey)).size,
            })}
            {version.effective_from
              ? ` · ${fill(tr("rtv.effective"), { date: formatDate(version.effective_from, locale) })}`
              : ""}
            {version.notes ? ` · ${version.notes}` : ""}
          </p>
        </div>
        {version.status === "draft" ? (
          <div className="flex flex-wrap gap-3">
            <Link
              href={`${base}/edit?batch=${batch}&section=${section}`}
              className="inline-flex h-10 items-center rounded-button border border-border px-4 font-body text-small font-semibold text-text hover:bg-surface-raised"
            >
              {tr("rte.edit")}
            </Link>
            <Link
              href={`${base}/publish`}
              className="inline-flex h-10 items-center rounded-button bg-accent px-4 font-body text-small font-semibold text-on-accent hover:opacity-90"
            >
              {tr("rtv.preview")}
            </Link>
          </div>
        ) : null}
      </div>

      {sp.published === "1" ? (
        <Card>
          <p role="status" className="font-body text-body font-semibold text-accent">
            {tr("rtp.done")}
          </p>
        </Card>
      ) : null}

      <Panel title={tr("rtv.sections")}>
        <div className="flex flex-wrap gap-1 border-b border-border">
          {batches.map((b) => (
            <Link
              key={b}
              href={`${base}?batch=${b}`}
              aria-current={b === batch ? "page" : undefined}
              className={cx(
                "-mb-px border-b-2 px-3 py-2 font-body text-body font-semibold",
                b === batch
                  ? "border-accent text-text"
                  : "border-transparent text-text-muted hover:text-text",
              )}
            >
              {b}
            </Link>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {sections.map((s) => (
            <Link
              key={s}
              href={`${base}?batch=${batch}&section=${s}`}
              aria-current={s === section ? "page" : undefined}
              className={cx(
                "rounded-lg border px-3 py-1 font-body text-small font-semibold",
                s === section
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border text-text-muted hover:text-text",
              )}
            >
              {batch}-{s}
            </Link>
          ))}
        </div>
        <div className="mt-4">
          {shown.length ? (
            <VersionGrid
              classes={shown}
              slots={slots}
              days={days}
              home={home?.code ?? null}
              tr={tr}
            />
          ) : (
            <p className="font-body text-body text-text-muted">{tr("md.none")}</p>
          )}
        </div>
      </Panel>
    </div>
  );
}
