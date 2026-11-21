import { describe, expect, it } from "vitest";
import { classSlotForm } from "../src/routine/editor";

const uuid = "00000000-0000-4000-8000-000000000001";
const base = {
  version_id: uuid,
  section_id: uuid,
  day: "2",
  time_slot_id: uuid,
  course_id: uuid,
  section_label: " b ",
  lab_group_id: "",
  faculty_id: uuid,
  room_id: "",
  span: "1",
  note: "",
};

describe("class form", () => {
  it("cleans and converts the form values", () => {
    expect(classSlotForm.parse(base)).toMatchObject({
      day: 2,
      section_label: "B",
      lab_group_id: null,
      room_id: null,
      span: 1,
      note: null,
    });
  });

  it("rejects bad days, spans and labels", () => {
    expect(classSlotForm.safeParse({ ...base, day: "7" }).success).toBe(false);
    expect(classSlotForm.safeParse({ ...base, span: "0" }).success).toBe(false);
    expect(classSlotForm.safeParse({ ...base, section_label: "B1" }).success).toBe(false);
    expect(classSlotForm.safeParse({ ...base, room_id: "x" }).success).toBe(false);
  });
});
