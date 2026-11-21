/**
 * Teacher and room views for the admin (ADM-RT-8): weekly load per teacher
 * and free rooms per time slot, from the classes of one version.
 */
import type { VersionClass } from "./versions";

export interface TeacherLoad {
  /** "DAMR" or "NI(ITM)" key used to pick the teacher. */
  key: string;
  initial: string;
  department: string | null;
  name: string | null;
  /** Class meetings per week (a merged cell counts once). */
  classes: number;
  labs: number;
  /** Teaching slots per week (a merged cell counts each slot). */
  slots: number;
  sections: number;
}

export const teacherKey = (c: Pick<VersionClass, "facultyInitial" | "facultyDept">) =>
  c.facultyDept ? `${c.facultyInitial}(${c.facultyDept})` : c.facultyInitial;

/** Every teacher with classes, most classes first. Classes without a teacher are left out. */
export function teacherLoads(classes: readonly VersionClass[]): TeacherLoad[] {
  const map = new Map<string, TeacherLoad & { sectionSet: Set<string> }>();
  for (const c of classes) {
    if (!c.facultyInitial) continue;
    const key = teacherKey(c);
    const t = map.get(key) ?? {
      key,
      initial: c.facultyInitial,
      department: c.facultyDept,
      name: c.facultyName,
      classes: 0,
      labs: 0,
      slots: 0,
      sections: 0,
      sectionSet: new Set<string>(),
    };
    t.classes += 1;
    t.slots += Math.max(1, c.span);
    if (c.labGroup) t.labs += 1;
    t.sectionSet.add(`${c.batch}-${c.section}`);
    map.set(key, t);
  }
  return [...map.values()]
    .map(({ sectionSet, ...t }) => ({ ...t, sections: sectionSet.size }))
    .sort((a, b) => b.classes - a.classes || a.key.localeCompare(b.key));
}

export interface RoomRef {
  id: string;
  building: string;
  number: string;
  type: string;
}

const roomKey = (building: string, number: string) =>
  `${building.toUpperCase()}|${number.toUpperCase()}`;

/** True when a class occupies this day and slot position (merged cells cover several slots). */
export function occupies(
  c: Pick<VersionClass, "day" | "slot" | "span">,
  day: number,
  slot: number,
) {
  return c.day === day && slot >= c.slot && slot < c.slot + Math.max(1, c.span);
}

/**
 * Rooms with no class at each slot position of a day (ADM-RT-8 "free rooms by
 * slot"), in building and number order.
 */
export function freeRooms(
  classes: readonly VersionClass[],
  rooms: readonly RoomRef[],
  day: number,
  slotPositions: readonly number[],
): Map<number, RoomRef[]> {
  const sorted = [...rooms].sort(
    (a, b) =>
      a.building.localeCompare(b.building) ||
      a.number.localeCompare(b.number, undefined, { numeric: true }),
  );
  const out = new Map<number, RoomRef[]>();
  for (const slot of slotPositions) {
    const busy = new Set(
      classes
        .filter((c) => c.room && occupies(c, day, slot))
        .map((c) => roomKey(c.building, c.room)),
    );
    out.set(
      slot,
      sorted.filter((r) => !busy.has(roomKey(r.building, r.number))),
    );
  }
  return out;
}
