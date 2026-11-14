import { describe, expect, it } from "vitest";
import { covers, monthGrid, monthRange, parseMonth, shiftMonth } from "./month";

describe("monthGrid", () => {
  it("starts weeks on Saturday by default (November 2026 starts on a Sunday)", () => {
    const weeks = monthGrid(2026, 11);
    expect(weeks[0]![0]).toEqual({ date: "2026-10-31", day: 31, inMonth: false });
    expect(weeks[0]![1]).toEqual({ date: "2026-11-01", day: 1, inMonth: true });
    const days = weeks.flat().filter((c) => c.inMonth);
    expect(days.length).toBe(30);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });

  it("honours another first day", () => {
    // Sunday = 1 in our index: 1 November 2026 opens the first week.
    expect(monthGrid(2026, 11, 1)[0]![0]!.date).toBe("2026-11-01");
  });
});

describe("month helpers", () => {
  it("gives the month range and moves between months", () => {
    expect(monthRange(2026, 2)).toEqual({ start: "2026-02-01", end: "2026-02-28" });
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
  });

  it("parses YYYY-MM", () => {
    const fb = { year: 2026, month: 11 };
    expect(parseMonth("2027-03", fb)).toEqual({ year: 2027, month: 3 });
    expect(parseMonth("2027-13", fb)).toEqual(fb);
    expect(parseMonth(undefined, fb)).toEqual(fb);
  });

  it("checks whether an entry covers a date", () => {
    expect(covers({ date: "2026-11-10", end_date: "2026-11-12" }, "2026-11-11")).toBe(true);
    expect(covers({ date: "2026-11-10", end_date: null }, "2026-11-11")).toBe(false);
    expect(covers({ date: "2026-11-10", end_date: null }, "2026-11-10")).toBe(true);
  });
});
