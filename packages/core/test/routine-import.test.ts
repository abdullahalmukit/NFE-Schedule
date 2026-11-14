import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  buildRoutineReview,
  effectiveClasses,
  EMPTY_OVERRIDES,
  readOverrides,
  routineApplyPlan,
  warningId,
  type RoutineExisting,
  type RoutineParse,
} from "../src/routine/import-review";
import { patternProblem, readRoutineRules, routineRulesSetting } from "../src/routine/parser-rules";

/** The independent expected output of the Fall 2026 V5 file (no parser needed). */
const fixture = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../../../fixtures/routine-fall-2026-v5.expected.json", import.meta.url)),
    "utf8",
  ),
) as RoutineParse & { stats: { batches: Record<string, unknown> } };

const parsed: RoutineParse = {
  timeSlots: fixture.timeSlots,
  classes: fixture.classes,
  issues: fixture.issues,
  tables: Object.keys(fixture.stats.batches).flatMap((batch) =>
    [...new Set(fixture.classes.filter((c) => c.batch === batch).map((c) => c.section))].map(
      (section, index) => ({ batch, section, index }),
    ),
  ),
};

const empty: RoutineExisting = {
  homeDepartment: "NFE",
  departments: ["NFE"],
  courses: [],
  faculty: [],
  batches: [],
  buildings: [],
  rooms: [],
  timeSlots: [],
  floorRule: "first_digit",
};

describe("first import of Fall 2026 V5", () => {
  const review = buildRoutineReview(parsed, empty, EMPTY_OVERRIDES);

  it("counts what mockup 8 shows", () => {
    expect(review.stats).toMatchObject({
      tables: 55,
      classes: 578,
      labSessions: 138,
      clashes: 0,
      unreadable: 0,
      roomsFound: 26,
    });
    expect(review.faculty).toHaveLength(79);
    expect(review.courses).toHaveLength(48);
    expect(review.batches.map((b) => [b.code, b.sections, b.tag])).toEqual([
      ["263", 6, "new"],
      ["262", 9, "new"],
      ["261", 3, "new"],
      ["253", 7, "new"],
      ["252", 5, "new"],
      ["251", 6, "new"],
      ["243", 8, "new"],
      ["241", 5, "new"],
      ["232", 6, "new"],
    ]);
  });

  it("lists every teacher with classes per week and marks the guest", () => {
    expect(review.faculty.every((f) => f.isNew)).toBe(true);
    expect(review.faculty.reduce((n, f) => n + f.classesPerWeek, 0)).toBe(578);
    expect(review.faculty.find((f) => f.initial === "NI")).toMatchObject({
      department: "ITM",
      guest: true,
    });
    expect(review.newItems.departments).toEqual(["ITM"]);
  });

  it("detects lab courses and prefixed codes", () => {
    expect(review.courses.find((c) => c.code === "0531-1104")?.detectedType).toBe("lab");
    expect(review.courses.find((c) => c.code === "0531-1103")?.detectedType).toBe("theory");
    expect(review.courses.find((c) => c.code === "AOL 0223-111")?.prefix).toBe("AOL");
  });

  it("creates buildings, rooms (with floor and type) and time slots", () => {
    expect([...review.newItems.buildings].sort()).toEqual(["AB", "AB-1", "AB-2", "AB-3", "Gym"]);
    expect(review.newItems.rooms).toHaveLength(26);
    const r304 = review.newItems.rooms.find((r) => r.building === "AB-1" && r.number === "304");
    expect(r304).toMatchObject({ floor: 3, type: "classroom" });
    expect(review.newItems.rooms.find((r) => r.building === "Gym")?.type).toBe("gym");
    expect(review.timeSlots.status).toBe("create");
  });

  it("blocks saving until the six cross-section warnings are decided", () => {
    expect(review.warnings).toHaveLength(6);
    expect(review.warnings.filter((w) => w.labGroupTable === "261-B")).toHaveLength(4);
    expect(review.warnings.filter((w) => w.table === "253-C" && !w.labGroupTable)).toHaveLength(2);
    expect(review.blockers).toEqual(["warnings"]);
    expect(
      routineApplyPlan({
        parsed,
        review,
        overrides: EMPTY_OVERRIDES,
        existing: empty,
        semesterId: "s",
        label: "5",
        sourceFilePath: null,
      }),
    ).toBeNull();
  });

  it("renames 261-B lab groups D1/D2 to B1/B2 when asked, keeping the label as written", () => {
    const overrides = {
      ...EMPTY_OVERRIDES,
      renameLabGroups: ["261-B"],
      accepted: review.warnings.filter((w) => w.table === "253-C").map((w) => w.id),
    };
    const classes = effectiveClasses(parsed.classes, overrides).filter(
      (c) => c.batch === "261" && c.section === "B" && c.sectionLabel === "D",
    );
    expect(new Set(classes.map((c) => c.labGroup))).toEqual(new Set(["B1", "B2"]));
    const done = buildRoutineReview(parsed, empty, overrides);
    expect(done.blockers).toEqual([]);
    const plan = routineApplyPlan({
      parsed,
      review: done,
      overrides,
      existing: empty,
      semesterId: "sem",
      label: "5",
      sourceFilePath: "sem/5.docx",
    })!;
    expect(plan.classes).toHaveLength(578);
    expect(plan.faculty).toHaveLength(79);
    expect(plan.courses).toHaveLength(48);
    expect(plan.batches).toHaveLength(9);
    expect(plan.sections).toHaveLength(55);
    expect(
      plan.lab_groups.filter((g) => g.batch === "261" && g.section === "B").map((g) => g.name),
    ).toEqual(["B1", "B2"]);
    expect(plan.time_slots).toHaveLength(6);
    expect(plan.classes.find((c) => c.initial === "NI")?.department).toBe("ITM");
    expect(plan.classes.find((c) => c.initial === "DNU")?.department).toBe("NFE");
  });
});

describe("later import", () => {
  const existing: RoutineExisting = {
    ...empty,
    departments: ["NFE", "ITM"],
    courses: [
      { code: "0531-1103", title: "Food Chemistry" },
      { code: "0531-1104", title: null },
    ],
    faculty: [
      {
        initial: "DNU",
        department: null,
        status: "active",
        full_name: "Dr. N. U.",
        is_guest: false,
      },
      { initial: "DAMR", department: "NFE", status: "active", full_name: null, is_guest: false },
      { initial: "OLD", department: null, status: "active", full_name: "Old", is_guest: false },
      { initial: "SIS", department: null, status: "left", full_name: "S", is_guest: false },
    ],
    batches: [
      { code: "263", status: "active", sections: [{ name: "A", labGroups: ["A1"] }] },
      { code: "223", status: "active", sections: [{ name: "A", labGroups: [] }] },
    ],
    buildings: ["AB-1"],
    rooms: [{ building: "AB-1", number: "304" }],
    timeSlots: fixture.timeSlots.map((s) => ({
      ...s,
      start: s.position === 1 ? "08:30" : s.start,
    })),
  };
  const review = buildRoutineReview(parsed, existing, EMPTY_OVERRIDES);

  it("asks only for what is missing", () => {
    expect(review.faculty.find((f) => f.initial === "DNU")).toBeUndefined();
    expect(review.faculty.find((f) => f.initial === "DAMR")).toMatchObject({ isNew: false });
    expect(review.courses.find((c) => c.code === "0531-1103")).toBeUndefined();
    expect(review.courses.find((c) => c.code === "0531-1104")).toMatchObject({ isNew: false });
    expect(review.newItems.departments).toEqual([]);
    expect(
      review.newItems.rooms.find((r) => r.number === "304" && r.building === "AB-1"),
    ).toBeUndefined();
  });

  it("tags new and graduating batches and suggests rollover steps (ADM-RT-10)", () => {
    expect(review.batches.find((b) => b.code === "263")?.tag).toBeNull();
    expect(review.batches.find((b) => b.code === "262")?.tag).toBe("new");
    expect(review.batches.find((b) => b.code === "223")?.tag).toBe("graduating");
    const kinds = review.suggestions.map((s) => `${s.kind}:${s.subject}`);
    expect(kinds).toContain("graduatingBatch:223");
    expect(kinds).toContain("absentTeacher:OLD");
    expect(kinds).toContain("guestTeacher:NI(ITM)");
    expect(kinds).toContain("timeSlots:");
    expect(kinds).toContain("leftTeacher:SIS");
    expect(review.newItems.sections.filter((s) => s.batch === "263").map((s) => s.name)).toEqual([
      "B",
      "C",
      "D",
      "E",
      "F",
    ]);
  });

  it("needs a decision when the file's times differ from the semester's", () => {
    expect(review.blockers).toContain("timeSlots");
    const keep = buildRoutineReview(parsed, existing, { ...EMPTY_OVERRIDES, timeSlots: "keep" });
    expect(keep.blockers).not.toContain("timeSlots");
    expect(keep.blockers).not.toContain("missingSlots");
  });
});

describe("overrides", () => {
  it("reads stored JSON safely", () => {
    expect(readOverrides(null)).toEqual(EMPTY_OVERRIDES);
    expect(
      readOverrides({ renameLabGroups: ["261-B", "261-B", 3], timeSlots: "x", graduate: ["223"] }),
    ).toEqual({ ...EMPTY_OVERRIDES, renameLabGroups: ["261-B"], graduate: ["223"] });
  });

  it("gives warnings a stable id", () => {
    expect(
      warningId({
        severity: "warning",
        code: "CROSS_SECTION_LABEL",
        message: "",
        table: "253-C",
        day: 2,
        slot: 4,
        raw: ["AOL 0223-111-D"],
      }),
    ).toBe("CROSS_SECTION_LABEL:253-C:2:4:AOL 0223-111-D");
  });
});

describe("routine format rules", () => {
  const rules = {
    tableTitle: String.raw`^(?<batch>\d{3})\s*-\s*(?<section>[A-Z])$`,
    courseLine: String.raw`^(?<code>\d{4}-\d{3,4})-(?<label>[A-Z])(?<group>\d)?$`,
    facultyLine: String.raw`^(?<initial>[A-Z]{1,6})$`,
    roomLine: String.raw`^(?<building>[A-Za-z-]+):\s*(?<room>\w+)$`,
    timeHeader: String.raw`^(?<sh>\d{1,2}):(?<sm>\d{2})-(?<eh>\d{1,2}):(?<em>\d{2})$`,
    pmBeforeHour: 8,
    days: { saturday: 0, শনিবার: 0 },
    lineOrder: ["course", "faculty", "room"],
  };

  it("accepts defaults or full rules and rejects broken patterns", () => {
    expect(routineRulesSetting.safeParse({ use_defaults: true }).success).toBe(true);
    expect(readRoutineRules({ use_defaults: true })).toBeNull();
    expect(readRoutineRules(rules)).toMatchObject({ pmBeforeHour: 8 });
    expect(patternProblem("courseLine", "(")).toBe("invalid");
    expect(patternProblem("roomLine", String.raw`^(?<building>\w+)$`)).toBe("group:room");
    expect(readRoutineRules({ ...rules, lineOrder: ["course", "course", "room"] })).toBeNull();
  });
});
