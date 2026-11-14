import Link from "next/link";
import { en, fill, hasArea, MASTER_FIELDS, type MasterKind, type MessageKey } from "@nfe/core";
import { Card } from "@nfe/ui/web";
import { getAdminContext } from "@/lib/admin";
import { ImportWizard } from "./import-wizard";

const IMPORT_KEYS = Object.keys(en).filter((k) => k.startsWith("imp.")) as MessageKey[];

/** A-7 page for one kind: title, back link and the wizard. */
export async function ImportPage({ kind }: { kind: MasterKind }) {
  const { access, tr } = await getAdminContext();
  const backHref = `/admin/${kind}`;
  if (!hasArea(access, kind)) {
    return (
      <Card>
        <p className="font-body text-body text-text-muted">
          {fill(tr("md.noArea"), { area: tr(`admin.area.${kind}`) })}
        </p>
      </Card>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={backHref} className="font-body text-small font-semibold text-accent">
          ← {tr(`admin.nav.${kind}`)}
        </Link>
        <h1 className="mt-1 font-display text-display font-bold">{tr(`imp.title.${kind}`)}</h1>
      </div>
      <ImportWizard
        kind={kind}
        backHref={backHref}
        labels={Object.fromEntries(IMPORT_KEYS.map((k) => [k, tr(k)]))}
        fields={MASTER_FIELDS[kind].map((d) => ({
          field: d.field,
          required: d.required,
          label: tr(`imp.field.${d.field}` as MessageKey),
        }))}
      />
    </div>
  );
}

/** "Import from a file" and template downloads, under the title of Courses / Faculty (A-6). */
export async function ImportActions({ kind }: { kind: MasterKind }) {
  const { tr } = await getAdminContext();
  const link =
    "inline-flex h-9 items-center rounded-button border border-border px-3 font-body text-small font-semibold text-text hover:bg-surface-raised";
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Link
        href={`/admin/${kind}/import`}
        className="inline-flex h-9 items-center rounded-button bg-accent px-3 font-body text-small font-semibold text-on-accent hover:opacity-90"
      >
        {tr("imp.button")}
      </Link>
      <span className="ml-2 font-body text-small text-text-muted" title={tr("imp.templateHelp")}>
        {tr("imp.template")}:
      </span>
      {(["csv", "xlsx", "json"] as const).map((f) => (
        <a
          key={f}
          href={`/api/admin/import/master/template?kind=${kind}&format=${f}`}
          className={link}
          download
        >
          {tr(`imp.format.${f}`)}
        </a>
      ))}
    </div>
  );
}
