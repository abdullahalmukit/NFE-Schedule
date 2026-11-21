import { describe, expect, it } from "vitest";
import { detectClashes, type ClashInput } from "../src";

const c = (over: Partial<ClashInput>): ClashInput => ({
  batch: "263",
  section: "A",
  day: 0,
  slot: 1,
  courseCode: "0531-1103",
  sectionLabel: "A",
  labGroup: null,
  facultyInitial: "DAMR",
  facultyDept: null,
  building: "AB-1",
  room: "304",
  ...over,
});

describe("clashes", () => {
  it("finds a teacher in two sections at once", () => {
    const out = detectClashes([c({}), c({ section: "B", sectionLabel: "B", room: "305" })]);
    expect(out.map((x) => x.kind)).toEqual(["teacher"]);
  });

  it("ignores classes without a teacher or room yet (manual editor)", () => {
    const out = detectClashes([
      c({ facultyInitial: "", building: "", room: "" }),
      c({ section: "B", sectionLabel: "B", facultyInitial: "", building: "", room: "" }),
    ]);
    expect(out).toEqual([]);
  });

  it("counts a merged cell on every slot it covers", () => {
    const out = detectClashes([
      c({ span: 2 }),
      c({ section: "B", sectionLabel: "B", slot: 2, facultyInitial: "SIS" }),
    ]);
    expect(out.map((x) => [x.kind, x.slot])).toEqual([["room", 2]]);
  });
});
