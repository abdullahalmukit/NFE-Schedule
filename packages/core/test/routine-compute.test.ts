/**
 * RT-1 personal routine, built from the Fall 2026 V5 expected output
 * (docs/DATABASE.md §2: 263-A Lab A1 on a Wednesday = 0531-1104 A1 at 08:20
 * and 0511-1105 at 14:40, with A2's 09:50 session hidden).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  calendarDayFor,
  freeGaps,
  routineFor,
  versionInEffectFor,
  weekRoutine,
  type ClassSlotRow,
  type ExceptionRow,
  type RoutineData,
  type Student,
} from "../src/routine/compute";
import { courseColorIndex } from "../src/format/course-color";
import { formatDuration, formatRange, formatTime, toBanglaDigits } from "../src/format/time";

interface FixtureClass {
  batch: string;
  section: string;
  day: number;
  slot: number;
  span: number;
  courseCode: string;
  sectionLabel: string;
  labGroup: string | null;
  facultyInitial: string;
  building: string;
  room: string;
}
const fixture = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../../../fixtures/routine-fall-2026-v5.expected.json", import.meta.url)),
    "utf8",
  ),
) as { classes: FixtureClass[]; timeSlots: { position: number; start: string; end: string }[] };

// Ids are readable stand-ins: section "263-A", lab group "263-A/A1", course = code.
const slots: ClassSlotRow[] = fixture.classes.map((c, i) => ({
  id: `c${i}`,
  version_id: "v5",
  section_id: `${c.batch}-${c.section}`,
  lab_group_id: c.labGroup ? `${c.batch}-${c.section}/${c.labGroup}` : null,
  course_id: c.courseCode,
  section_label: c.sectionLabel,
  faculty_id: c.facultyInitial,
  room_id: `${c.building}:${c.room}`,
  day: c.day,
  time_slot_id: `ts${c.slot}`,
  span: c.span,
  note: null,
}));
const timeSlots = fixture.timeSlots.map((s) => ({
  id: `ts${s.position}`,
  position: s.position,
  start_time: `${s.start}:00`,
  end_time: `${s.end}:00`,
}));
const base: RoutineData = {
  semesterId: "fall26",
  versions: [
    {
      id: "v5",
      semester_id: "fall26",
      status: "published",
      effective_from: "2026-11-01",
      published_at: "2026-10-30T10:00:00Z",
    },
  ],
  slots,
  timeSlots,
};
const a1: Student = { batchId: "b263", sectionId: "263-A", labGroupId: "263-A/A1" };
const WED = "2026-11-25";
const brief = (d: ReturnType<typeof routineFor>) =>
  d.entries.map((e) => [e.start, e.courseId, e.labGroupId, e.status]);

describe("personal routine (RT-1)", () => {
  it("matches the documented Wednesday of 263-A Lab A1", () => {
    const d = routineFor(base, a1, WED);
    expect(brief(d)).toEqual([
      ["08:20", "0531-1104", "263-A/A1", "normal"],
      ["14:40", "0511-1105", null, "normal"],
    ]);
    expect(d.hiddenLabSessions).toBe(1);
    expect(d.versionId).toBe("v5");
  });

  it("gives every student of a section the same theory and only their own lab", () => {
    const a2 = routineFor(base, { ...a1, labGroupId: "263-A/A2" }, WED);
    expect(brief(a2).map((e) => e[0])).toEqual(["09:50", "14:40"]);
    const week = weekRoutine(base, a1, "2026-11-21");
    const total = week.reduce((n, d) => n + d.entries.length, 0);
    const expected = fixture.classes.filter(
      (c) => c.batch === "263" && c.section === "A" && (!c.labGroup || c.labGroup === "A1"),
    ).length;
    expect(total).toBe(expected);
    expect(week[6]!.entries).toEqual([]); // Friday
  });

  it("adds retake classes from another section", () => {
    const course = fixture.classes.find(
      (c) => c.batch === "262" && c.section === "A" && !c.labGroup,
    )!;
    const date = [
      "2026-11-21",
      "2026-11-22",
      "2026-11-23",
      "2026-11-24",
      "2026-11-25",
      "2026-11-26",
    ][course.day]!;
    const d = routineFor(
      base,
      { ...a1, extra: [{ course_id: course.courseCode, section_id: "262-A", lab_group_id: null }] },
      date,
    );
    expect(d.entries.some((e) => e.source === "extra" && e.courseId === course.courseCode)).toBe(
      true,
    );
  });

  it("uses the version in effect on the date", () => {
    const versions = [
      ...base.versions,
      {
        id: "v6",
        semester_id: "fall26",
        status: "published" as const,
        effective_from: "2026-12-01",
        published_at: "2026-11-20T10:00:00Z",
      },
      {
        id: "draft",
        semester_id: "fall26",
        status: "draft" as const,
        effective_from: null,
        published_at: null,
      },
    ];
    expect(versionInEffectFor(versions, "fall26", "2026-11-30")?.id).toBe("v5");
    expect(versionInEffectFor(versions, "fall26", "2026-12-01")?.id).toBe("v6");
    expect(versionInEffectFor(versions, "fall26", "2026-10-01")).toBeNull();
  });

  it("hides classes on holidays for the batch and keeps them on special days", () => {
    const calendar = [
      {
        date: "2026-11-25",
        end_date: null,
        type: "holiday" as const,
        title: "Victory Day",
        applies_to: null,
      },
      {
        date: "2026-11-26",
        end_date: "2026-11-28",
        type: "exam_week" as const,
        title: "Mid",
        applies_to: { batch_ids: ["b262"] },
      },
    ];
    expect(routineFor({ ...base, calendar }, a1, WED)).toMatchObject({
      off: { type: "holiday" },
      entries: [],
    });
    expect(calendarDayFor(calendar, "2026-11-26", "b263")).toBeNull();
    expect(calendarDayFor(calendar, "2026-11-27", "b262")?.title).toBe("Mid");
  });

  it("applies exceptions: cancelled, room change, reschedule and makeup", () => {
    const lab = slots.find(
      (s) => s.section_id === "263-A" && s.day === 4 && s.lab_group_id === "263-A/A1",
    )!;
    const theory = slots.find((s) => s.section_id === "263-A" && s.day === 4 && !s.lab_group_id)!;
    const ex = (over: Partial<ExceptionRow>): ExceptionRow => ({
      id: Math.random().toString(36),
      class_slot_id: null,
      section_id: "263-A",
      lab_group_id: null,
      date: WED,
      type: "cancelled",
      course_id: null,
      faculty_id: null,
      new_date: null,
      new_time_slot_id: null,
      new_start: null,
      new_end: null,
      new_room_id: null,
      note: null,
      ...over,
    });
    const exceptions = [
      ex({ class_slot_id: lab.id, type: "room_change", new_room_id: "AB-1:999" }),
      ex({
        class_slot_id: theory.id,
        type: "rescheduled",
        new_date: "2026-11-26",
        new_time_slot_id: "ts3",
      }),
      ex({
        id: "mk",
        type: "makeup",
        course_id: "0531-1103",
        new_time_slot_id: "ts6",
        note: "Makeup",
      }),
      ex({
        id: "other",
        type: "makeup",
        lab_group_id: "263-A/A2",
        course_id: "0531-1104",
        new_time_slot_id: "ts4",
      }),
    ];
    const d = routineFor({ ...base, exceptions }, a1, WED);
    expect(d.entries.map((e) => [e.start, e.courseId, e.status, e.roomId])).toEqual([
      ["08:20", "0531-1104", "room_changed", "AB-1:999"],
      ["16:10", "0531-1103", "makeup", null],
    ]);
    expect(d.movedAway).toMatchObject([
      { classSlotId: theory.id, toDate: "2026-11-26", toStart: "11:20" },
    ]);
    const thu = routineFor({ ...base, exceptions }, a1, "2026-11-26");
    expect(thu.entries.find((e) => e.status === "moved_here")).toMatchObject({
      courseId: "0511-1105",
      start: "11:20",
    });
    const cancelled = routineFor({ ...base, exceptions: [ex({ class_slot_id: lab.id })] }, a1, WED);
    expect(cancelled.entries[0]!.status).toBe("cancelled");
  });

  it("finds free time between classes", () => {
    const d = routineFor(base, a1, WED);
    expect(freeGaps(d.entries)).toEqual([{ start: "09:50", end: "14:40", minutes: 290 }]);
  });
});

describe("formatting", () => {
  it("shows times like the routine file, 24 h, and in Bangla", () => {
    expect(formatTime("13:10")).toBe("01:10");
    expect(formatTime("08:20:00")).toBe("08:20");
    expect(formatTime("12:30")).toBe("12:30");
    expect(formatTime("13:10", "24h")).toBe("13:10");
    expect(formatRange("13:10", "14:40", "file", "bn")).toBe("০১:১০–০২:৪০");
    expect(toBanglaDigits("263-A")).toBe("২৬৩-A");
  });

  it("formats durations", () => {
    expect(formatDuration(290)).toBe("4 h 50 min");
    expect(formatDuration(120)).toBe("2 h");
    expect(formatDuration(40, "bn")).toBe("৪০ মিনিট");
  });

  it("gives a course the same colour everywhere", () => {
    expect(courseColorIndex("0531-1104")).toBe(courseColorIndex(" 0531-1104 "));
    expect(courseColorIndex("aol 0223-111")).toBe(courseColorIndex("AOL 0223-111"));
    const codes = [...new Set(fixture.classes.map((c) => c.courseCode))];
    const used = new Set(codes.map((c) => courseColorIndex(c)));
    expect(used.size).toBeGreaterThanOrEqual(6); // 48 codes spread over the 8 colours
    expect(codes.every((c) => courseColorIndex(c) >= 0 && courseColorIndex(c) < 8)).toBe(true);
  });
});
