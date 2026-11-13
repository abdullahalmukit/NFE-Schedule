/**
 * Compare two routine versions for the "Preview changes" step and to work
 * out who must be notified.
 *
 * Classes are grouped by identity = section + course + section label + lab
 * group. Inside a group, entries at the same day/slot are "unchanged" (or
 * "changed" if teacher/room differ); leftovers are paired as "moved"; any
 * remainder is "added" or "removed".
 */
export interface DiffInput {
  batch: string;
  section: string;
  day: number;
  slot: number;
  courseCode: string;
  sectionLabel: string;
  labGroup: string | null;
  facultyInitial: string;
  facultyDept?: string | null;
  building: string;
  room: string;
}

export type ChangeKind = "added" | "removed" | "moved" | "changed";

export interface Change<T extends DiffInput> {
  kind: ChangeKind;
  before?: T;
  after?: T;
  fields?: Array<"day" | "slot" | "faculty" | "room">;
}

export interface RoutineDiff<T extends DiffInput> {
  changes: Change<T>[];
  unchanged: number;
  /** "263-B" for theory changes, "263-B/B2" when only one lab group is affected */
  affected: string[];
}

const idOf = (c: DiffInput) => `${c.batch}-${c.section}|${c.courseCode}|${c.sectionLabel}|${c.labGroup ?? ""}`;
const whereOf = (c: DiffInput) => `${c.day}|${c.slot}`;
const sameDetails = (a: DiffInput, b: DiffInput) =>
  a.facultyInitial === b.facultyInitial && (a.facultyDept ?? null) === (b.facultyDept ?? null) &&
  a.building === b.building && a.room === b.room;

export function diffRoutines<T extends DiffInput>(before: T[], after: T[]): RoutineDiff<T> {
  const group = (xs: T[]) => {
    const m = new Map<string, T[]>();
    for (const x of xs) (m.get(idOf(x)) ?? m.set(idOf(x), []).get(idOf(x))!).push(x);
    return m;
  };
  const A = group(before);
  const B = group(after);
  const changes: Change<T>[] = [];
  let unchanged = 0;

  for (const id of new Set([...A.keys(), ...B.keys()])) {
    const olds = [...(A.get(id) ?? [])];
    const news = [...(B.get(id) ?? [])];

    // 1. Same time slot -> unchanged or details changed.
    for (let i = olds.length - 1; i >= 0; i--) {
      const j = news.findIndex((n) => whereOf(n) === whereOf(olds[i]));
      if (j < 0) continue;
      const o = olds.splice(i, 1)[0];
      const n = news.splice(j, 1)[0];
      if (sameDetails(o, n)) unchanged++;
      else {
        const fields: Change<T>["fields"] = [];
        if (o.facultyInitial !== n.facultyInitial || (o.facultyDept ?? null) !== (n.facultyDept ?? null)) fields.push("faculty");
        if (o.building !== n.building || o.room !== n.room) fields.push("room");
        changes.push({ kind: "changed", before: o, after: n, fields });
      }
    }
    // 2. Pair the rest as moves.
    while (olds.length && news.length) {
      const o = olds.shift()!;
      const n = news.shift()!;
      const fields: Change<T>["fields"] = [];
      if (o.day !== n.day) fields.push("day");
      if (o.slot !== n.slot) fields.push("slot");
      if (o.facultyInitial !== n.facultyInitial) fields.push("faculty");
      if (o.building !== n.building || o.room !== n.room) fields.push("room");
      changes.push({ kind: "moved", before: o, after: n, fields });
    }
    for (const o of olds) changes.push({ kind: "removed", before: o });
    for (const n of news) changes.push({ kind: "added", after: n });
  }

  const affected = new Set<string>();
  for (const c of changes) {
    for (const x of [c.before, c.after]) {
      if (!x) continue;
      affected.add(x.labGroup ? `${x.batch}-${x.section}/${x.labGroup}` : `${x.batch}-${x.section}`);
    }
  }
  return { changes, unchanged, affected: [...affected].sort() };
}
