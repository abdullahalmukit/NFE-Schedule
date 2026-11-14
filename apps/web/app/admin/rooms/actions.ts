"use server";

import { buildingForm, floorFromRoomNumber, readSetting, roomForm } from "@nfe/core";
import { formValues, invalid, uuid, written, type ActionResult } from "@/lib/master-data";
import { createClient } from "@/lib/supabase/server";

const PATH = ["/admin/rooms"];

export async function saveBuilding(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const parsed = buildingForm.safeParse(formValues(form, ["code", "name"]));
  if (!parsed.success) return invalid(parsed.error);
  const id = String(form.get("id") ?? "");
  const supabase = await createClient();
  const result = uuid.test(id)
    ? await supabase.from("buildings").update(parsed.data).eq("id", id).select("id")
    : await supabase.from("buildings").insert(parsed.data).select("id");
  return written(result, "rooms", PATH);
}

export async function setBuildingArchived(
  _prev: ActionResult | null,
  form: FormData,
): Promise<ActionResult> {
  const id = String(form.get("id") ?? "");
  const archive = form.get("archive") === "1";
  if (!uuid.test(id)) return { ok: false, message: "" };
  const supabase = await createClient();
  const result = await supabase
    .from("buildings")
    .update({ deleted_at: archive ? new Date().toISOString() : null })
    .eq("id", id)
    .select("id");
  return written(result, "rooms", PATH, archive ? "md.archived" : "md.restored");
}

/** Add or edit a room; an empty floor is filled in from the number by `room.floor_rule`. */
export async function saveRoom(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const parsed = roomForm.safeParse(
    formValues(form, ["building_id", "number", "floor", "type", "capacity", "is_active"]),
  );
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const room = { ...parsed.data };
  if (room.floor === null) {
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "room.floor_rule")
      .maybeSingle();
    room.floor = floorFromRoomNumber(room.number, readSetting("room.floor_rule", data?.value).mode);
  }
  const id = String(form.get("id") ?? "");
  const result = uuid.test(id)
    ? await supabase.from("rooms").update(room).eq("id", id).select("id")
    : await supabase.from("rooms").insert(room).select("id");
  return written(result, "rooms", PATH);
}
