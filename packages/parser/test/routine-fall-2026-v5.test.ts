/**
 * Gate 2 of the roadmap: the import must reproduce the Fall 2026 V5 file
 * exactly. Run: npx tsx test/routine-fall-2026-v5.test.ts
 * (Later moved into vitest; keep the same assertions.)
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";
import { parseRoutineDocx, diffRoutines } from "../src";

const root = join(__dirname, "..", "..", "..", "fixtures");
const file = new Uint8Array(readFileSync(join(root, "routine-fall-2026-v5.docx")));
const expected = JSON.parse(readFileSync(join(root, "routine-fall-2026-v5.expected.json"), "utf8"));

const r = parseRoutineDocx(file);

assert.equal(r.stats.tables, 55, "55 section tables");
assert.equal(r.stats.classes, 578, "578 class cells");
assert.equal(r.stats.labSessions, 138, "138 lab group sessions");
assert.equal(r.stats.courseCodes, 48, "48 course codes");
assert.equal(r.stats.facultyInitials, 79, "79 faculty initials");
assert.equal(r.stats.rooms, 26, "26 rooms");
assert.equal(r.stats.teacherClashes, 0, "no teacher clash");
assert.equal(r.stats.roomClashes, 0, "no room clash");
assert.equal(r.stats.errors, 0, "no errors");
assert.deepEqual(
  r.timeSlots.map((s) => [s.start, s.end]),
  [["08:20", "09:50"], ["09:50", "11:20"], ["11:20", "12:50"], ["13:10", "14:40"], ["14:40", "16:10"], ["16:10", "17:40"]],
);
assert.deepEqual(r.stats.batches["263"], { sections: 6, labGroups: 12 });
assert.equal(r.issues.filter((i) => i.code === "CROSS_SECTION_LABEL").length, 6, "6 known cross-section labels");

// Exact record-by-record match with the fixture.
const strip = (c: any) => ({ ...c, raw: undefined, span: undefined });
assert.deepEqual(r.classes.map(strip), expected.classes.map(strip));

// Diff sanity: identical versions -> no changes; one moved class -> 1 move.
assert.equal(diffRoutines(r.classes, r.classes).changes.length, 0);
const moved = r.classes.map((c, i) => (i === 0 ? { ...c, slot: 6 } : c));
const d = diffRoutines(r.classes, moved);
assert.equal(d.changes.length, 1);
assert.equal(d.changes[0].kind, "moved");

console.log("routine-fall-2026-v5: all assertions passed", r.stats);
