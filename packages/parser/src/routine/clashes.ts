/**
 * Clash detection shared by the import review and the admin grid editor.
 *
 * - Teacher clash: one faculty initial in two different classes at the same
 *   day + slot.
 * - Room clash: one room holding two different classes at the same day + slot.
 * - Section clash: one section (or the same lab group / section-wide theory
 *   against any of its lab groups) booked twice at the same day + slot.
 *
 * The same course + section label + lab group appearing in two tables at the
 * same time is a combined class (e.g. a retake section sitting in), not a
 * clash. Admin can mark further exceptions in the review screen.
 */
export interface ClashInput {
  id?: string;
  batch: string;
  section: string;
  day: number;
  slot: number;
  span?: number;
  courseCode: string;
  sectionLabel: string;
  labGroup: string | null;
  facultyInitial: string;
  facultyDept?: string | null;
  building: string;
  room: string;
}

export interface Clash<T extends ClashInput> {
  kind: "teacher" | "room" | "section";
  key: string;
  day: number;
  slot: number;
  items: T[];
}

function slotsOf(c: ClashInput): number[] {
  const n = Math.max(1, c.span ?? 1);
  return Array.from({ length: n }, (_, i) => c.slot + i);
}

const classSig = (c: ClashInput) => `${c.courseCode}|${c.sectionLabel}|${c.labGroup ?? ""}`;

export function detectClashes<T extends ClashInput>(classes: T[]): Clash<T>[] {
  const buckets = new Map<string, { kind: Clash<T>["kind"]; day: number; slot: number; items: T[] }>();
  const add = (kind: Clash<T>["kind"], key: string, day: number, slot: number, c: T) => {
    const k = `${kind}#${key}#${day}#${slot}`;
    const b = buckets.get(k) ?? { kind, day, slot, items: [] };
    b.items.push(c);
    buckets.set(k, b);
  };

  for (const c of classes) {
    for (const s of slotsOf(c)) {
      add("teacher", `${c.facultyInitial}(${c.facultyDept ?? ""})`, c.day, s, c);
      add("room", `${c.building}:${c.room}`, c.day, s, c);
      add("section", `${c.batch}-${c.section}`, c.day, s, c);
    }
  }

  const out: Clash<T>[] = [];
  for (const [k, b] of buckets) {
    if (b.items.length < 2) continue;
    const key = k.split("#")[1];
    if (b.kind === "section") {
      // Different lab groups of one section may run in parallel (A1 / A2).
      const theory = b.items.filter((i) => !i.labGroup);
      const groups = b.items.filter((i) => i.labGroup).map((i) => i.labGroup);
      const dupGroup = new Set(groups).size !== groups.length;
      if (theory.length > 1 || (theory.length === 1 && groups.length > 0) || dupGroup) {
        out.push({ kind: "section", key, day: b.day, slot: b.slot, items: b.items });
      }
      continue;
    }
    if (new Set(b.items.map(classSig)).size > 1) {
      out.push({ kind: b.kind, key, day: b.day, slot: b.slot, items: b.items });
    }
  }
  return out;
}
