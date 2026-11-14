import { describe, expect, it } from "vitest";
import { courseForm, facultyForm, labGroupForm, roomForm } from "./forms";
import {
  floorFromRoomNumber,
  normalizeCourseCode,
  normalizeInitial,
  normalizePhone,
  splitInitial,
  toLatinDigits,
} from "./normalize";

describe("normalise", () => {
  it("converts Bangla digits", () => {
    expect(toLatinDigits("ব্যাচ ২৬৩")).toBe("ব্যাচ 263");
  });

  it("cleans initials and splits a guest department", () => {
    expect(normalizeInitial(" damr ")).toBe("DAMR");
    expect(splitInitial("NI(ITM)")).toEqual({ initial: "NI", department: "ITM" });
    expect(splitInitial("sis")).toEqual({ initial: "SIS", department: null });
  });

  it("normalises course codes like the routine file", () => {
    expect(normalizeCourseCode("0531-1104")).toEqual({ code: "0531-1104", removedSection: null });
    expect(normalizeCourseCode("0531 1104")?.code).toBe("0531-1104");
    expect(normalizeCourseCode("aol0223-111")?.code).toBe("AOL 0223-111");
    expect(normalizeCourseCode("০২৩১-১১১")?.code).toBe("0231-111");
    expect(normalizeCourseCode("0531-1104-A1")).toEqual({ code: "0531-1104", removedSection: "A" });
    expect(normalizeCourseCode("Food chemistry")).toBeNull();
  });

  it("keeps phone digits and the leading +", () => {
    expect(normalizePhone("+880 1711-000000")).toBe("+8801711000000");
    expect(normalizePhone("০১৭১১ ০০০০০০")).toBe("01711000000");
  });

  it("works out the floor from the room number", () => {
    expect(floorFromRoomNumber("304", "first_digit")).toBe(3);
    expect(floorFromRoomNumber("1002", "first_digit")).toBe(1);
    expect(floorFromRoomNumber("G01", "first_digit")).toBeNull();
    expect(floorFromRoomNumber("304", "manual")).toBeNull();
  });
});

const ID = "6f1c2c1e-3b1a-4c55-9b7e-2f0c1d2e3a4b";

describe("forms", () => {
  it("course: normalises the code and converts numbers", () => {
    const r = courseForm.parse({
      code: "0531 1104",
      title: " Food Chemistry ",
      title_bn: "",
      credit: "৩",
      type: "theory",
      offering_department_id: "",
    });
    expect(r).toEqual({
      code: "0531-1104",
      title: "Food Chemistry",
      title_bn: null,
      credit: 3,
      type: "theory",
      offering_department_id: null,
    });
    expect(courseForm.safeParse({ ...r, code: "nonsense", credit: "", title: "" }).success).toBe(
      false,
    );
  });

  it("faculty: builds contact visibility from the switches", () => {
    const r = facultyForm.parse({
      initial: "damr",
      full_name: "",
      designation: "Lecturer",
      department_id: "",
      email: " Teacher@DIU.edu.bd ",
      phone: "",
      office_room: "",
      consultation_hours: "",
      status: "active",
      is_guest: "",
      joined_on: "",
      left_on: "",
      show_email: "on",
      show_phone: undefined,
      show_office_room: "on",
    });
    expect(r.initial).toBe("DAMR");
    expect(r.email).toBe("teacher@diu.edu.bd");
    expect(r.is_guest).toBe(false);
    expect(r.contact_visibility).toEqual({ email: true, phone: false, office_room: true });
  });

  it("lab group and room rules", () => {
    expect(labGroupForm.safeParse({ section_id: ID, name: "a1" }).success).toBe(true);
    expect(labGroupForm.safeParse({ section_id: ID, name: "A" }).success).toBe(false);
    const room = roomForm.parse({
      building_id: ID,
      number: "৩০৪",
      floor: "",
      type: "lab",
      capacity: "40",
      is_active: "on",
    });
    expect(room).toMatchObject({ number: "304", floor: null, capacity: 40, is_active: true });
  });
});
