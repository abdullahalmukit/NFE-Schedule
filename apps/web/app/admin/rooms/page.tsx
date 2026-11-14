import Link from "next/link";
import { fill, hasArea, type MessageKey } from "@nfe/core";
import { Card, cx, Panel, Pill } from "@nfe/ui/web";
import { getAdminContext } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { ActionForm } from "../_components/action-form";
import { CheckboxField, Hidden, SelectField, TextField } from "../_components/fields";
import { ListToolbar } from "../_components/list-toolbar";
import { saveBuilding, saveRoom, setBuildingArchived } from "./actions";

const TYPES = ["classroom", "lab", "gym", "other"] as const;

/** A-9 Buildings and rooms: type, floor, capacity, in use (ADM-MD-4). */
export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; edit?: string; building?: string; archived?: string }>;
}) {
  const { access, tr } = await getAdminContext();
  if (!hasArea(access, "rooms")) {
    return (
      <Card>
        <p className="font-body text-body text-text-muted">
          {fill(tr("md.noArea"), { area: tr("admin.area.rooms") })}
        </p>
      </Card>
    );
  }
  const sp = await searchParams;
  const supabase = await createClient();
  const [{ data: buildings }, { data: rooms }] = await Promise.all([
    supabase.from("buildings").select("id, code, name, deleted_at").order("code"),
    supabase
      .from("rooms")
      .select("id, building_id, number, floor, type, capacity, is_active")
      .is("deleted_at", null)
      .order("number"),
  ]);
  const activeBuildings = (buildings ?? []).filter((b) => !b.deleted_at);
  const codeOf = (id: string) => buildings?.find((b) => b.id === id)?.code ?? "?";
  const q = (sp.q ?? "").trim().toLowerCase();
  const list = (rooms ?? [])
    .filter((r) => sp.archived === "1" || r.is_active)
    .filter((r) => !q || `${codeOf(r.building_id)}: ${r.number}`.toLowerCase().includes(q))
    .sort(
      (a, b) =>
        codeOf(a.building_id).localeCompare(codeOf(b.building_id)) ||
        a.number.localeCompare(b.number),
    );
  const editing = rooms?.find((r) => r.id === sp.edit);
  const editingBuilding = buildings?.find((b) => b.id === sp.building);
  const typeLabel = (t: string) => tr(`room.type.${t}` as MessageKey);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-display font-bold">{tr("admin.nav.rooms")}</h1>
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Panel title={fill(tr("room.count"), { n: list.length })}>
          <ListToolbar
            path="/admin/rooms"
            q={sp.q ?? ""}
            archived={sp.archived === "1"}
            labels={{ search: tr("md.search"), showArchived: tr("room.inactive") }}
          />
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {list.map((r) => (
              <Link
                key={r.id}
                href={`/admin/rooms?edit=${r.id}`}
                className={cx(
                  "flex flex-col gap-1 rounded-card border border-border p-3 hover:bg-surface-raised",
                  r.id === sp.edit && "border-accent",
                  !r.is_active && "opacity-60",
                )}
              >
                <span className="font-body text-small text-text-muted">
                  {codeOf(r.building_id)}
                </span>
                <span className="font-display text-title font-bold">{r.number}</span>
                <span className="flex flex-wrap gap-1">
                  {r.type !== "classroom" ? (
                    <Pill size="sm" tone="info" label={typeLabel(r.type)} />
                  ) : null}
                  {r.floor !== null ? (
                    <Pill size="sm" label={`${tr("room.floor")} ${r.floor}`} />
                  ) : null}
                  {r.capacity ? <Pill size="sm" label={`${r.capacity}`} /> : null}
                </span>
              </Link>
            ))}
          </div>
          {list.length === 0 ? (
            <p className="mt-4 font-body text-body text-text-muted">{tr("md.none")}</p>
          ) : null}
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel
            title={
              editing
                ? `${tr("md.edit")}: ${codeOf(editing.building_id)}: ${editing.number}`
                : tr("room.new")
            }
            description={tr("room.floorHelp")}
            aside={
              editing ? (
                <Link
                  href="/admin/rooms"
                  className="font-body text-small font-semibold text-accent"
                >
                  {tr("md.cancel")}
                </Link>
              ) : undefined
            }
          >
            {activeBuildings.length === 0 ? (
              <p className="font-body text-small text-text-muted">{tr("md.none")}</p>
            ) : (
              <ActionForm
                key={editing?.id ?? "new"}
                action={saveRoom}
                submitLabel={editing ? tr("md.save") : tr("md.add")}
                resetOnSuccess={!editing}
              >
                {editing ? <Hidden name="id" value={editing.id} /> : null}
                <div className="grid grid-cols-2 gap-3">
                  <SelectField
                    name="building_id"
                    label={tr("room.building")}
                    defaultValue={editing?.building_id ?? activeBuildings[0]?.id}
                    options={activeBuildings.map((b) => ({ value: b.id, label: b.code }))}
                  />
                  <TextField
                    name="number"
                    label={tr("room.number")}
                    required
                    defaultValue={editing?.number}
                    placeholder="304"
                  />
                  <TextField name="floor" label={tr("room.floor")} defaultValue={editing?.floor} />
                  <TextField
                    name="capacity"
                    label={tr("room.capacity")}
                    defaultValue={editing?.capacity}
                  />
                </div>
                <SelectField
                  name="type"
                  label={tr("room.type")}
                  defaultValue={editing?.type ?? "classroom"}
                  options={TYPES.map((t) => ({ value: t, label: typeLabel(t) }))}
                />
                <CheckboxField
                  name="is_active"
                  label={tr("room.active")}
                  defaultChecked={editing ? editing.is_active : true}
                />
              </ActionForm>
            )}
          </Panel>

          <Panel title={tr("room.buildings")}>
            <div className="mb-4 flex flex-col divide-y divide-border">
              {(buildings ?? []).map((b) => (
                <div key={b.id} className="flex items-center gap-3 py-2">
                  <span className="w-20 font-body text-body font-semibold">{b.code}</span>
                  <span className="flex-1 font-body text-small text-text-muted">{b.name}</span>
                  {b.deleted_at ? <Pill size="sm" label={tr("status.archived")} /> : null}
                  <Link
                    href={`/admin/rooms?building=${b.id}`}
                    className="font-body text-small font-semibold text-accent"
                  >
                    {tr("md.edit")}
                  </Link>
                </div>
              ))}
            </div>
            <ActionForm
              key={editingBuilding?.id ?? "new-building"}
              action={saveBuilding}
              submitLabel={editingBuilding ? tr("md.save") : tr("room.newBuilding")}
              resetOnSuccess={!editingBuilding}
            >
              {editingBuilding ? <Hidden name="id" value={editingBuilding.id} /> : null}
              <div className="grid grid-cols-2 gap-3">
                <TextField
                  name="code"
                  label={tr("room.buildingCode")}
                  required
                  defaultValue={editingBuilding?.code}
                  placeholder="AB-1"
                />
                <TextField
                  name="name"
                  label={tr("room.buildingName")}
                  defaultValue={editingBuilding?.name}
                />
              </div>
            </ActionForm>
            {editingBuilding ? (
              <div className="mt-3">
                <ActionForm
                  key={`arch-${editingBuilding.id}-${Boolean(editingBuilding.deleted_at)}`}
                  action={setBuildingArchived}
                  submitLabel={editingBuilding.deleted_at ? tr("md.restore") : tr("md.archive")}
                  variant={editingBuilding.deleted_at ? "secondary" : "danger"}
                >
                  <Hidden name="id" value={editingBuilding.id} />
                  <Hidden name="archive" value={editingBuilding.deleted_at ? "0" : "1"} />
                </ActionForm>
              </div>
            ) : null}
          </Panel>
        </div>
      </div>
    </div>
  );
}
