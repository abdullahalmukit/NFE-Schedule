/**
 * Routine versions for the admin (ADM-RT-3, ADM-RT-4, ADM-RT-7): the shape a
 * version's classes are loaded in, grouping of changes by section, which
 * sections / lab groups a publish notifies, and labels for restored copies.
 * The diff itself is `diffRoutines` in `@nfe/parser` (same shape as here).
 */

/** One class of a version, as shown on the grid and compared by the diff. */
export interface VersionClass {
  id: string;
  batch: string;
  section: string;
  labGroup: string | null;
  courseCode: string;
  courseTitle: string | null;
  sectionLabel: string;
  facultyInitial: string;
  facultyDept: string | null;
  facultyName: string | null;
  building: string;
  room: string;
  day: number;
  /** Time slot position (1 = first column). */
  slot: number;
  span: number;
  note: string | null;
}

/** "263-B", the key the diff uses for a section. */
export const sectionKey = (c: { batch: string; section: string }) => `${c.batch}-${c.section}`;

export interface ChangeLike<T> {
  kind: "added" | "removed" | "moved" | "changed";
  before?: T;
  after?: T;
}

/** Changes grouped by section ("263-B"), sections in batch order (newest first), then A–Z. */
export function changesBySection<
  T extends { batch: string; section: string; day: number; slot: number },
>(changes: readonly ChangeLike<T>[]): { section: string; changes: ChangeLike<T>[] }[] {
  const groups = new Map<string, ChangeLike<T>[]>();
  for (const c of changes) {
    const k = sectionKey((c.after ?? c.before)!);
    groups.set(k, [...(groups.get(k) ?? []), c]);
  }
  const at = (c: ChangeLike<T>) => {
    const x = (c.after ?? c.before)!;
    return x.day * 100 + x.slot;
  };
  return [...groups.entries()]
    .sort(([a], [b]) => {
      const [ba, sa] = a.split("-");
      const [bb, sb] = b.split("-");
      return bb!.localeCompare(ba!, undefined, { numeric: true }) || sa!.localeCompare(sb!);
    })
    .map(([section, list]) => ({ section, changes: [...list].sort((a, b) => at(a) - at(b)) }));
}

/**
 * The diff's affected keys ("263-B", "263-B/B2") → section and lab group ids
 * for `publish_routine_version`. A section-wide key notifies the whole
 * section; a lab-group key only that group (unless the section is already in).
 */
export function affectedIds(
  keys: readonly string[],
  sections: readonly { id: string; batch: string; name: string }[],
  labGroups: readonly { id: string; batch: string; section: string; name: string }[],
): { sectionIds: string[]; labGroupIds: string[] } {
  const sectionIds = new Set<string>();
  const wholeSections = new Set<string>();
  for (const k of keys) {
    if (k.includes("/")) continue;
    const s = sections.find((x) => sectionKey({ batch: x.batch, section: x.name }) === k);
    if (s) {
      sectionIds.add(s.id);
      wholeSections.add(k);
    }
  }
  const labGroupIds = new Set<string>();
  for (const k of keys) {
    const [sec, group] = k.split("/");
    if (!group || wholeSections.has(sec!)) continue;
    const g = labGroups.find(
      (x) => sectionKey({ batch: x.batch, section: x.section }) === sec && x.name === group,
    );
    if (g) labGroupIds.add(g.id);
  }
  return { sectionIds: [...sectionIds], labGroupIds: [...labGroupIds] };
}

/** A free label for a restored or edited copy: "5" → "5.1", then "5.2" … */
export function nextLabel(base: string, taken: readonly string[]): string {
  const used = new Set(taken.map((t) => t.toLowerCase()));
  const root = base.replace(/\.\d+$/, "");
  for (let n = 1; ; n++) {
    const label = `${root}.${n}`;
    if (!used.has(label.toLowerCase())) return label;
  }
}
