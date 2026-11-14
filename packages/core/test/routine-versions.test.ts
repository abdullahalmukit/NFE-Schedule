import { describe, expect, it } from "vitest";
import { affectedIds, changesBySection, nextLabel } from "../src/routine/versions";

const c = (batch: string, section: string, day: number, slot: number) => ({
  batch,
  section,
  day,
  slot,
});

describe("routine versions", () => {
  it("groups changes by section, newest batch first, in week order", () => {
    const groups = changesBySection([
      { kind: "added", after: c("261", "A", 0, 1) },
      { kind: "moved", before: c("263", "B", 3, 3), after: c("263", "B", 3, 5) },
      { kind: "removed", before: c("263", "B", 1, 2) },
      { kind: "changed", before: c("263", "A", 2, 1), after: c("263", "A", 2, 1) },
    ]);
    expect(groups.map((g) => g.section)).toEqual(["263-A", "263-B", "261-A"]);
    expect(groups[1]!.changes.map((x) => x.kind)).toEqual(["removed", "moved"]);
  });

  it("maps affected keys to section and lab group ids", () => {
    const sections = [
      { id: "s263b", batch: "263", name: "B" },
      { id: "s263c", batch: "263", name: "C" },
    ];
    const labGroups = [
      { id: "gB2", batch: "263", section: "B", name: "B2" },
      { id: "gC1", batch: "263", section: "C", name: "C1" },
    ];
    expect(affectedIds(["263-B", "263-B/B2", "263-C/C1", "999-Z"], sections, labGroups)).toEqual({
      sectionIds: ["s263b"],
      labGroupIds: ["gC1"],
    });
  });

  it("finds a free label for a copy", () => {
    expect(nextLabel("5", ["5"])).toBe("5.1");
    expect(nextLabel("5.1", ["5", "5.1", "5.2"])).toBe("5.3");
    expect(nextLabel("Final", [])).toBe("Final.1");
  });
});
