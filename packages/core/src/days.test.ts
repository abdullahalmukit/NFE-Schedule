import { describe, expect, it } from "vitest";
import { DAY_KEYS, dayIndexFromJsDay, dayIndexOf } from "./days";

describe("day index", () => {
  it("starts the week on Saturday", () => {
    expect(DAY_KEYS[0]).toBe("saturday");
    expect(DAY_KEYS[6]).toBe("friday");
  });

  it("maps JavaScript days", () => {
    expect(dayIndexFromJsDay(6)).toBe(0); // Saturday
    expect(dayIndexFromJsDay(0)).toBe(1); // Sunday
    expect(dayIndexFromJsDay(5)).toBe(6); // Friday
  });

  it("maps a date", () => {
    // 11 November 2026 is a Wednesday.
    expect(DAY_KEYS[dayIndexOf(new Date(2026, 10, 11))]).toBe("wednesday");
  });
});
