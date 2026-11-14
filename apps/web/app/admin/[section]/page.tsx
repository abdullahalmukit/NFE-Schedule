import { notFound } from "next/navigation";
import { canOpen, fill, findAdminNavItem } from "@nfe/core";
import { Card } from "@nfe/ui/web";
import { getAdminContext } from "@/lib/admin";

/**
 * Admin sections whose pages come in later branches (routine, courses, …).
 * Each later branch adds a real page at /admin/<section>, which takes
 * precedence over this one.
 */
export default async function AdminSectionSoon({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const item = findAdminNavItem(section);
  if (!item) notFound();
  const { access, tr } = await getAdminContext();
  if (!canOpen(access, item)) {
    return (
      <Card>
        <p className="font-body text-body text-text-muted">
          {item.mainOnly ? tr("admin.mainOnly") : tr("admin.noAccess.body")}
        </p>
      </Card>
    );
  }
  return (
    <Card>
      <h1 className="font-display text-title font-bold">
        {fill(tr("admin.soon.title"), { section: tr(item.label) })}
      </h1>
      <p className="mt-2 font-body text-body text-text-muted">{tr("admin.soon.body")}</p>
    </Card>
  );
}
