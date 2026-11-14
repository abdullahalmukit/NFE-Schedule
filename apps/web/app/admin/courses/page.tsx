import Link from "next/link";
import { fill, hasArea, type MessageKey } from "@nfe/core";
import { Card, cx, Panel, Pill } from "@nfe/ui/web";
import { getAdminContext } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "../_components/action-form";
import { Hidden, SelectField, TextField } from "../_components/fields";
import { ListToolbar } from "../_components/list-toolbar";
import { saveCourse, setCourseStatus } from "./actions";

const TYPES = ["theory", "lab", "other"] as const;

/** A-6 Courses: table + side form; archive instead of delete (ADM-MD-4). */
export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; edit?: string; archived?: string }>;
}) {
  const { access, tr } = await getAdminContext();
  if (!hasArea(access, "courses")) {
    return (
      <Card>
        <p className="font-body text-body text-text-muted">
          {fill(tr("md.noArea"), { area: tr("admin.area.courses") })}
        </p>
      </Card>
    );
  }
  const { q = "", edit, archived } = await searchParams;
  const supabase = await createClient();
  const [{ data: courses }, { data: departments }] = await Promise.all([
    supabase
      .from("courses")
      .select("id, code, title, title_bn, credit, type, status, offering_department_id")
      .is("deleted_at", null)
      .order("code"),
    supabase.from("departments").select("id, code").is("deleted_at", null).order("code"),
  ]);
  const needle = q.trim().toLowerCase();
  const list = (courses ?? []).filter(
    (c) =>
      (archived === "1" || c.status !== "archived") &&
      (!needle ||
        [c.code, c.title ?? "", c.title_bn ?? ""].some((s) => s.toLowerCase().includes(needle))),
  );
  const editing = courses?.find((c) => c.id === edit);
  const typeLabel = (t: string) => tr(`course.type.${t}` as MessageKey);
  const deptCode = (id: string | null) => departments?.find((d) => d.id === id)?.code ?? "";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-display font-bold">{tr("admin.nav.courses")}</h1>
        <p className="mt-1 font-body text-small text-text-muted">{tr("md.importSoon")}</p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Panel title={fill(tr("course.count"), { n: list.length })}>
          <ListToolbar
            path="/admin/courses"
            q={q}
            archived={archived === "1"}
            labels={{ search: tr("md.search"), showArchived: tr("md.showArchived") }}
          />
          <table className="mt-4 w-full border-collapse font-body text-small">
            <thead>
              <tr className="border-b border-border text-left text-text-muted">
                <th className="py-2 pr-3 font-semibold">{tr("course.code")}</th>
                <th className="py-2 pr-3 font-semibold">{tr("course.titleEn")}</th>
                <th className="py-2 pr-3 font-semibold">{tr("course.credit")}</th>
                <th className="py-2 pr-3 font-semibold">{tr("course.type")}</th>
                <th className="py-2 pr-3 font-semibold">{tr("course.dept")}</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr
                  key={c.id}
                  className={cx(
                    "border-b border-border last:border-b-0",
                    c.id === edit && "bg-surface-raised",
                  )}
                >
                  <td className="py-2 pr-3 font-semibold">{c.code}</td>
                  <td className="py-2 pr-3">
                    {c.title ?? <span className="text-text-faint">—</span>}
                    {c.title_bn ? (
                      <span className="block text-text-muted">{c.title_bn}</span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-3">{c.credit ?? "—"}</td>
                  <td className="py-2 pr-3">{typeLabel(c.type)}</td>
                  <td className="py-2 pr-3">{deptCode(c.offering_department_id)}</td>
                  <td className="py-2 text-right">
                    {c.status === "archived" ? (
                      <Pill size="sm" label={tr("status.archived")} />
                    ) : null}{" "}
                    <Link
                      href={`/admin/courses?edit=${c.id}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                      className="font-semibold text-accent"
                    >
                      {tr("md.edit")}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 ? (
            <p className="mt-4 font-body text-body text-text-muted">{tr("md.none")}</p>
          ) : null}
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel
            title={
              editing ? fill(tr("course.editTitle"), { code: editing.code }) : tr("course.new")
            }
            aside={
              editing ? (
                <Link
                  href="/admin/courses"
                  className="font-body text-small font-semibold text-accent"
                >
                  {tr("md.cancel")}
                </Link>
              ) : undefined
            }
          >
            <ActionForm
              key={editing?.id ?? "new"}
              action={saveCourse}
              submitLabel={editing ? tr("md.save") : tr("md.add")}
              resetOnSuccess={!editing}
            >
              {editing ? <Hidden name="id" value={editing.id} /> : null}
              <TextField
                name="code"
                label={tr("course.code")}
                required
                defaultValue={editing?.code}
                placeholder="0531-1104"
              />
              <TextField name="title" label={tr("course.titleEn")} defaultValue={editing?.title} />
              <TextField
                name="title_bn"
                label={tr("course.titleBn")}
                defaultValue={editing?.title_bn}
              />
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  name="credit"
                  label={tr("course.credit")}
                  defaultValue={editing?.credit}
                />
                <SelectField
                  name="type"
                  label={tr("course.type")}
                  defaultValue={editing?.type ?? "theory"}
                  options={TYPES.map((t) => ({ value: t, label: typeLabel(t) }))}
                />
              </div>
              <SelectField
                name="offering_department_id"
                label={tr("course.dept")}
                defaultValue={editing?.offering_department_id}
                options={[
                  { value: "", label: "—" },
                  ...(departments ?? []).map((d) => ({ value: d.id, label: d.code })),
                ]}
              />
            </ActionForm>
          </Panel>
          {editing ? (
            <ActionForm
              key={`status-${editing.id}-${editing.status}`}
              action={setCourseStatus}
              submitLabel={editing.status === "archived" ? tr("md.restore") : tr("md.archive")}
              variant={editing.status === "archived" ? "secondary" : "danger"}
            >
              <Hidden name="id" value={editing.id} />
              <Hidden name="status" value={editing.status === "archived" ? "active" : "archived"} />
            </ActionForm>
          ) : null}
        </div>
      </div>
    </div>
  );
}
