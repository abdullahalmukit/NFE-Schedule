import Link from "next/link";
import { fill, hasArea, type MessageKey } from "@nfe/core";
import { Card, cx, Panel, Pill } from "@nfe/ui/web";
import { getAdminContext } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "../_components/action-form";
import { CheckboxField, Hidden, SelectField, TextArea, TextField } from "../_components/fields";
import { ListToolbar } from "../_components/list-toolbar";
import { saveDepartment, saveFaculty, setDepartmentArchived, setFacultyArchived } from "./actions";
import { PhotoUpload } from "./photo-upload";

const STATUSES = ["active", "on_leave", "left"] as const;

type Search = { q?: string; edit?: string; archived?: string; tab?: string };

/** A-6 Faculty and departments (ADM-MD-4), photo and contact visibility (ADM-MD-5). */
export default async function FacultyPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { access, tr } = await getAdminContext();
  if (!hasArea(access, "faculty")) {
    return (
      <Card>
        <p className="font-body text-body text-text-muted">
          {fill(tr("md.noArea"), { area: tr("admin.area.faculty") })}
        </p>
      </Card>
    );
  }
  const sp = await searchParams;
  const tab = sp.tab === "departments" ? "departments" : "teachers";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-display font-bold">{tr("admin.nav.faculty")}</h1>
        <p className="mt-1 font-body text-small text-text-muted">{tr("md.importSoon")}</p>
      </div>
      <div className="flex gap-1 border-b border-border">
        {(["teachers", "departments"] as const).map((t) => (
          <Link
            key={t}
            href={t === "teachers" ? "/admin/faculty" : "/admin/faculty?tab=departments"}
            aria-current={tab === t ? "page" : undefined}
            className={cx(
              "-mb-px border-b-2 px-4 py-2 font-body text-body font-semibold",
              tab === t
                ? "border-accent text-text"
                : "border-transparent text-text-muted hover:text-text",
            )}
          >
            {tr(t === "teachers" ? "fac.tabTeachers" : "fac.tabDepartments")}
          </Link>
        ))}
      </div>
      {tab === "teachers" ? <Teachers sp={sp} /> : <Departments sp={sp} />}
    </div>
  );
}

async function Teachers({ sp }: { sp: Search }) {
  const { tr } = await getAdminContext();
  const supabase = await createClient();
  const [{ data: faculty }, { data: departments }] = await Promise.all([
    supabase
      .from("faculty")
      .select(
        "id, initial, full_name, designation, department_id, email, phone, office_room, consultation_hours, status, is_guest, joined_on, left_on, contact_visibility, photo_path, updated_at, deleted_at",
      )
      .order("initial"),
    supabase.from("departments").select("id, code, is_home").is("deleted_at", null).order("code"),
  ]);
  const q = (sp.q ?? "").trim().toLowerCase();
  const list = (faculty ?? []).filter(
    (f) =>
      (sp.archived === "1" || !f.deleted_at) &&
      (!q ||
        [f.initial, f.full_name ?? "", f.designation ?? "", f.email ?? ""].some((s) =>
          s.toLowerCase().includes(q),
        )),
  );
  const editing = faculty?.find((f) => f.id === sp.edit);
  const visibility = (editing?.contact_visibility ?? {
    email: true,
    phone: false,
    office_room: true,
  }) as Record<string, boolean>;
  const deptCode = (id: string | null) => departments?.find((d) => d.id === id)?.code ?? "";
  const homeDept = departments?.find((d) => d.is_home)?.id ?? "";
  const statusLabel = (s: string) => tr(`fac.status.${s}` as MessageKey);
  const photoUrl = editing?.photo_path
    ? `${supabase.storage.from("faculty-photos").getPublicUrl(editing.photo_path).data.publicUrl}?v=${encodeURIComponent(editing.updated_at)}`
    : null;

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <Panel title={fill(tr("fac.count"), { n: list.length })}>
        <ListToolbar
          path="/admin/faculty"
          q={sp.q ?? ""}
          archived={sp.archived === "1"}
          labels={{ search: tr("md.search"), showArchived: tr("md.showArchived") }}
        />
        <table className="mt-4 w-full border-collapse font-body text-small">
          <thead>
            <tr className="border-b border-border text-left text-text-muted">
              <th className="py-2 pr-3 font-semibold">{tr("fac.initial")}</th>
              <th className="py-2 pr-3 font-semibold">{tr("fac.name")}</th>
              <th className="py-2 pr-3 font-semibold">{tr("fac.department")}</th>
              <th className="py-2 pr-3 font-semibold">{tr("fac.email")}</th>
              <th className="py-2 pr-3 font-semibold">{tr("md.status")}</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {list.map((f) => (
              <tr
                key={f.id}
                className={cx(
                  "border-b border-border last:border-b-0",
                  f.id === sp.edit && "bg-surface-raised",
                )}
              >
                <td className="py-2 pr-3 font-semibold">
                  {f.initial}
                  {f.is_guest ? (
                    <span className="ml-2 text-text-muted">· {deptCode(f.department_id)}</span>
                  ) : null}
                </td>
                <td className="py-2 pr-3">
                  {f.full_name ?? <span className="text-text-faint">—</span>}
                  {f.designation ? (
                    <span className="block text-text-muted">{f.designation}</span>
                  ) : null}
                </td>
                <td className="py-2 pr-3">{deptCode(f.department_id)}</td>
                <td className="py-2 pr-3 break-all">{f.email ?? "—"}</td>
                <td className="py-2 pr-3">
                  {f.deleted_at ? (
                    <Pill size="sm" label={tr("status.archived")} />
                  ) : f.status !== "active" ? (
                    <Pill size="sm" tone="warning" label={statusLabel(f.status)} />
                  ) : (
                    statusLabel(f.status)
                  )}
                </td>
                <td className="py-2 text-right">
                  <Link href={`/admin/faculty?edit=${f.id}`} className="font-semibold text-accent">
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
          title={editing ? `${tr("md.edit")}: ${editing.initial}` : tr("fac.new")}
          aside={
            editing ? (
              <Link
                href="/admin/faculty"
                className="font-body text-small font-semibold text-accent"
              >
                {tr("md.cancel")}
              </Link>
            ) : undefined
          }
        >
          <div className="mb-4">
            {editing ? (
              <PhotoUpload
                facultyId={editing.id}
                initial={editing.initial}
                photoUrl={photoUrl}
                labels={{
                  upload: tr("fac.uploadPhoto"),
                  remove: tr("fac.removePhoto"),
                  help: tr("fac.photoHelp"),
                  tooBig: tr("fac.photoTooBig"),
                  type: tr("fac.photoType"),
                  failed: tr("fac.photoFailed"),
                }}
              />
            ) : (
              <p className="font-body text-small text-text-muted">{tr("fac.saveFirst")}</p>
            )}
          </div>
          <ActionForm
            key={editing?.id ?? "new"}
            action={saveFaculty}
            submitLabel={editing ? tr("md.save") : tr("md.add")}
            resetOnSuccess={!editing}
          >
            {editing ? <Hidden name="id" value={editing.id} /> : null}
            <div className="grid grid-cols-2 gap-3">
              <TextField
                name="initial"
                label={tr("fac.initial")}
                required
                defaultValue={editing?.initial}
                placeholder="DAMR"
              />
              <SelectField
                name="department_id"
                label={tr("fac.department")}
                defaultValue={editing ? editing.department_id : homeDept}
                options={[
                  { value: "", label: "—" },
                  ...(departments ?? []).map((d) => ({ value: d.id, label: d.code })),
                ]}
              />
            </div>
            <TextField name="full_name" label={tr("fac.name")} defaultValue={editing?.full_name} />
            <TextField
              name="designation"
              label={tr("fac.designation")}
              defaultValue={editing?.designation}
            />
            <div className="grid grid-cols-2 gap-3">
              <TextField
                name="email"
                type="email"
                label={tr("fac.email")}
                defaultValue={editing?.email}
              />
              <TextField
                name="phone"
                type="tel"
                label={tr("fac.phone")}
                defaultValue={editing?.phone}
              />
            </div>
            <TextField
              name="office_room"
              label={tr("fac.office")}
              defaultValue={editing?.office_room}
            />
            <TextArea
              name="consultation_hours"
              label={tr("fac.consultation")}
              defaultValue={editing?.consultation_hours}
            />
            <fieldset className="flex flex-col gap-2 rounded-xl border border-border p-3">
              <legend className="px-1 font-body text-caption font-semibold text-text-muted">
                {tr("fac.visibility")}
              </legend>
              <CheckboxField
                name="show_email"
                label={tr("fac.email")}
                defaultChecked={visibility.email}
              />
              <CheckboxField
                name="show_phone"
                label={tr("fac.phone")}
                defaultChecked={visibility.phone}
              />
              <CheckboxField
                name="show_office_room"
                label={tr("fac.office")}
                defaultChecked={visibility.office_room}
              />
            </fieldset>
            <div className="grid grid-cols-3 gap-3">
              <SelectField
                name="status"
                label={tr("md.status")}
                defaultValue={editing?.status ?? "active"}
                options={STATUSES.map((s) => ({ value: s, label: statusLabel(s) }))}
              />
              <TextField
                name="joined_on"
                type="date"
                label={tr("fac.joined")}
                defaultValue={editing?.joined_on}
              />
              <TextField
                name="left_on"
                type="date"
                label={tr("fac.leftOn")}
                defaultValue={editing?.left_on}
              />
            </div>
            <CheckboxField
              name="is_guest"
              label={tr("fac.guest")}
              defaultChecked={editing?.is_guest}
            />
          </ActionForm>
        </Panel>
        {editing ? (
          <ActionForm
            key={`arch-${editing.id}-${Boolean(editing.deleted_at)}`}
            action={setFacultyArchived}
            submitLabel={editing.deleted_at ? tr("md.restore") : tr("md.archive")}
            variant={editing.deleted_at ? "secondary" : "danger"}
          >
            <Hidden name="id" value={editing.id} />
            <Hidden name="archive" value={editing.deleted_at ? "0" : "1"} />
          </ActionForm>
        ) : null}
      </div>
    </div>
  );
}

async function Departments({ sp }: { sp: Search }) {
  const { tr } = await getAdminContext();
  const supabase = await createClient();
  const { data: departments } = await supabase
    .from("departments")
    .select("id, code, name, is_home, deleted_at")
    .order("code");
  const list = (departments ?? []).filter((d) => sp.archived === "1" || !d.deleted_at);
  const editing = departments?.find((d) => d.id === sp.edit);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <Panel title={tr("fac.tabDepartments")}>
        <ListToolbar
          path="/admin/faculty"
          q=""
          archived={sp.archived === "1"}
          extra={{ tab: "departments" }}
          labels={{ search: tr("md.search"), showArchived: tr("md.showArchived") }}
        />
        <div className="mt-4 flex flex-col divide-y divide-border">
          {list.map((d) => (
            <div key={d.id} className="flex items-center gap-3 py-3">
              <span className="w-20 font-body text-body font-semibold">{d.code}</span>
              <span className="flex-1 font-body text-small text-text-muted">{d.name}</span>
              {d.is_home ? <Pill size="sm" tone="accent" label={tr("dept.home")} /> : null}
              {d.deleted_at ? <Pill size="sm" label={tr("status.archived")} /> : null}
              <Link
                href={`/admin/faculty?tab=departments&edit=${d.id}`}
                className="font-body text-small font-semibold text-accent"
              >
                {tr("md.edit")}
              </Link>
            </div>
          ))}
        </div>
      </Panel>
      <div className="flex flex-col gap-4">
        <Panel title={editing ? `${tr("md.edit")}: ${editing.code}` : tr("dept.new")}>
          <ActionForm
            key={editing?.id ?? "new"}
            action={saveDepartment}
            submitLabel={editing ? tr("md.save") : tr("md.add")}
            resetOnSuccess={!editing}
          >
            {editing ? <Hidden name="id" value={editing.id} /> : null}
            <TextField
              name="code"
              label={tr("dept.code")}
              required
              defaultValue={editing?.code}
              placeholder="ITM"
            />
            <TextField name="name" label={tr("dept.name")} defaultValue={editing?.name} />
          </ActionForm>
        </Panel>
        {editing && !editing.is_home ? (
          <ActionForm
            key={`arch-${editing.id}-${Boolean(editing.deleted_at)}`}
            action={setDepartmentArchived}
            submitLabel={editing.deleted_at ? tr("md.restore") : tr("md.archive")}
            variant={editing.deleted_at ? "secondary" : "danger"}
          >
            <Hidden name="id" value={editing.id} />
            <Hidden name="archive" value={editing.deleted_at ? "0" : "1"} />
          </ActionForm>
        ) : null}
      </div>
    </div>
  );
}
