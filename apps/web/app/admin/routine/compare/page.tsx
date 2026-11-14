import Link from "next/link";
import { fill, hasArea } from "@nfe/core";
import { Card, Panel } from "@nfe/ui/web";
import { getAdminContext } from "@/lib/admin";
import { diffVersions, loadSlots, loadVersion, loadVersionClasses } from "@/lib/routine-versions";
import { createClient } from "@/lib/supabase/server";
import { ChangeList } from "../_components/change-list";

/** Compare any two versions (ADM-RT-7): what changed from A to B, by section. */
export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
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
  const { a = "", b = "" } = await searchParams;
  const supabase = await createClient();
  const [va, vb] = await Promise.all([loadVersion(supabase, a), loadVersion(supabase, b)]);
  const back = (
    <Link href="/admin/routine" className="font-body text-small font-semibold text-accent">
      ← {tr("admin.nav.routine")}
    </Link>
  );
  if (!va || !vb) {
    return (
      <div className="flex flex-col gap-4">
        {back}
        <Card>
          <p className="font-body text-body text-text-muted">{tr("rtv.pickTwo")}</p>
        </Card>
      </div>
    );
  }
  const [before, after, slots] = await Promise.all([
    loadVersionClasses(supabase, va.id),
    loadVersionClasses(supabase, vb.id),
    loadSlots(supabase, vb.semester_id),
  ]);
  const diff = diffVersions(before, after);
  return (
    <div className="flex flex-col gap-6">
      <div>
        {back}
        <h1 className="mt-1 font-display text-display font-bold">
          {fill(tr("rtv.compareTitle"), { a: va.label, b: vb.label })}
        </h1>
        <p className="font-body text-small text-text-muted">
          {fill(tr("rtv.compareSummary"), { changes: diff.changes.length, same: diff.unchanged })}
        </p>
      </div>
      <Panel title={tr("rtp.changes")}>
        <ChangeList changes={diff.changes} slots={slots} tr={tr} />
      </Panel>
    </div>
  );
}
