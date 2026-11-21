import { describe, expect, it } from "vitest";
import { classExceptionForm, dayIndexOfDate } from "../src/routine/exceptions";
import type { VersionClass } from "../src/routine/versions";
import { freeRooms, occupies, teacherLoads } from "../src/routine/views";

const cls = (over: Partial<VersionClass>): VersionClass => ({
  id: Math.random().toString(36),
  batch: "263",
  section: "A",
  labGroup: null,
  courseCode: "0531-1103",
  courseTitle: null,
  sectionLabel: "A",
  facultyInitial: "DAMR",
  facultyDept: null,
  facultyName: "Dr. A",
  building: "AB-1",
  room: "304",
  day: 0,
  slot: 1,
  span: 1,
  note: null,
  ...over,
});

describe("teacher load", () => {
  it("counts classes, labs, slots and sections per teacher", () => {
    const loads = teacherLoads([
      cls({}),
      cls({ section: "B", day: 1, labGroup: "B1", span: 2 }),
      cls({ facultyInitial: "NI", facultyDept: "ITM", day: 2 }),
      cls({ facultyInitial: "", day: 3 }),
    ]);
    expect(loads.map((l) => [l.key, l.classes, l.labs, l.slots, l.sections])).toEqual([
      ["DAMR", 2, 1, 3, 2],
      ["NI(ITM)", 1, 0, 1, 1],
    ]);
  });
});

describe("free rooms", () => {
  const rooms = [
    { id: "r305", building: "AB-1", number: "305", type: "classroom" },
    { id: "r304", building: "AB-1", number: "304", type: "classroom" },
    { id: "g", building: "Gym", number: "407", type: "gym" },
  ];

  it("leaves out rooms with a class, including merged cells", () => {
    const free = freeRooms(
      [cls({ span: 2 }), cls({ room: "305", slot: 3 })],
      rooms,
      0,
      [1, 2, 3, 4],
    );
    expect(free.get(1)!.map((r) => r.id)).toEqual(["r305", "g"]);
    expect(free.get(2)!.map((r) => r.id)).toEqual(["r305", "g"]);
    expect(free.get(3)!.map((r) => r.id)).toEqual(["r304", "g"]);
    expect(free.get(4)!.map((r) => r.id)).toEqual(["r304", "r305", "g"]);
    expect(occupies(cls({ slot: 2, span: 2 }), 0, 3)).toBe(true);
  });
});

describe("class exception form", () => {
  const uuid = "00000000-0000-4000-8000-000000000001";
  const base = {
    type: "cancelled",
    section_id: uuid,
    date: "2026-11-23",
    class_slot_id: uuid,
    lab_group_id: "",
    course_id: uuid,
    faculty_id: "",
    new_date: "2026-11-24",
    new_time_slot_id: uuid,
    new_room_id: uuid,
    note: " Teacher is ill ",
  };

  it("keeps only the fields of the type", () => {
    expect(classExceptionForm.parse(base)).toMatchObject({
      class_slot_id: uuid,
      course_id: null,
      new_date: null,
      new_time_slot_id: null,
      new_room_id: null,
      note: "Teacher is ill",
    });
    expect(classExceptionForm.parse({ ...base, type: "room_change" })).toMatchObject({
      new_room_id: uuid,
      new_date: null,
    });
  });

  it("asks for what each type needs", () => {
    expect(classExceptionForm.safeParse({ ...base, class_slot_id: "" }).success).toBe(false);
    expect(
      classExceptionForm.safeParse({ ...base, type: "rescheduled", new_date: "" }).success,
    ).toBe(false);
    expect(
      classExceptionForm.safeParse({ ...base, type: "room_change", new_room_id: "" }).success,
    ).toBe(false);
    const makeup = classExceptionForm.parse({ ...base, type: "makeup", class_slot_id: "" });
    expect(makeup).toMatchObject({ class_slot_id: null, course_id: uuid, new_time_slot_id: uuid });
    expect(classExceptionForm.safeParse({ ...base, type: "makeup", course_id: "" }).success).toBe(
      false,
    );
  });

  it("knows the routine day of a date (0 = Saturday)", () => {
    expect(dayIndexOfDate("2026-11-21")).toBe(0); // Saturday
    expect(dayIndexOfDate("2026-11-23")).toBe(2); // Monday
    expect(dayIndexOfDate("2026-11-27")).toBe(6); // Friday
  });
});
