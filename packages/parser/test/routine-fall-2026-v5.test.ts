/**
 * Gate 2 of the roadmap: the import must reproduce the Fall 2026 V5 file
 * exactly (NF-3). Every assertion from the original script is kept.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { diffRoutines, parseRoutineDocx, type ParsedClass } from "../src";

const fixtures = fileURLToPath(new URL("../../../fixtures/", import.meta.url));
const file = new Uint8Array(readFileSync(`${fixtures}routine-fall-2026-v5.docx`));
const expected = JSON.parse(
  readFileSync(`${fixtures}routine-fall-2026-v5.expected.json`, "utf8"),
) as { classes: ParsedClass[] };

const r = parseRoutineDocx(file);

describe("routine Fall 2026 V5", () => {
  it("has the expected stats", () => {
    expect(r.stats.tables, "55 section tables").toBe(55);
    expect(r.stats.classes, "578 class cells").toBe(578);
    expect(r.stats.labSessions, "138 lab group sessions").toBe(138);
    expect(r.stats.courseCodes, "48 course codes").toBe(48);
    expect(r.stats.facultyInitials, "79 faculty initials").toBe(79);
    expect(r.stats.rooms, "26 rooms").toBe(26);
    expect(r.stats.teacherClashes, "no teacher clash").toBe(0);
    expect(r.stats.roomClashes, "no room clash").toBe(0);
    expect(r.stats.errors, "no errors").toBe(0);
  });

  it("reads the six time slots", () => {
    expect(r.timeSlots.map((s) => [s.start, s.end])).toEqual([
      ["08:20", "09:50"],
      ["09:50", "11:20"],
      ["11:20", "12:50"],
      ["13:10", "14:40"],
      ["14:40", "16:10"],
      ["16:10", "17:40"],
    ]);
  });

  it("finds batch 263 with 6 sections and 12 lab groups", () => {
    expect(r.stats.batches["263"]).toEqual({ sections: 6, labGroups: 12 });
  });

  it("reports the 6 known cross-section labels", () => {
    expect(r.issues.filter((i) => i.code === "CROSS_SECTION_LABEL").length).toBe(6);
  });

  it("matches the fixture record by record", () => {
    const strip = (c: ParsedClass) => ({ ...c, raw: undefined, span: undefined });
    expect(r.classes.map(strip)).toEqual(expected.classes.map(strip));
  });

  it("diffs versions", () => {
    expect(diffRoutines(r.classes, r.classes).changes.length).toBe(0);
    const moved = r.classes.map((c, i) => (i === 0 ? { ...c, slot: 6 } : c));
    const d = diffRoutines(r.classes, moved);
    expect(d.changes.length).toBe(1);
    expect(d.changes[0]?.kind).toBe("moved");
  });
});
