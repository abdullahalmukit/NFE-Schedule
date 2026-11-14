import { describe, expect, it } from "vitest";
import { ADMIN_AREAS, adminNav, canOpen, findAdminNavItem, hasArea, settingsMenu } from "./access";
import { changedFields, showValue } from "./audit-diff";
import { adminErrorKey } from "./errors";

const slugs = (items: { slug: string }[]) => items.map((i) => i.slug);

describe("admin access", () => {
  it("main admin has every area and sees every link", () => {
    const main = { isMain: true, areas: [] };
    expect(ADMIN_AREAS.every((a) => hasArea(main, a))).toBe(true);
    const nav = adminNav(main);
    expect(slugs(nav.main)).toEqual([
      "routine",
      "courses",
      "faculty",
      "batches",
      "notices",
      "rooms",
      "cr-requests",
    ]);
    expect(slugs(nav.more)).toEqual([
      "calendar",
      "users",
      "reports",
      "releases",
      "settings",
      "admins",
      "audit",
    ]);
  });

  it("an area admin sees only their areas, never Admins or Audit log", () => {
    const nav = adminNav({ isMain: false, areas: ["notices", "cr"] });
    expect(slugs(nav.main)).toEqual(["notices", "cr-requests"]);
    expect(slugs(nav.more)).toEqual([]);
    expect(canOpen({ isMain: false, areas: ["users"] }, findAdminNavItem("audit")!)).toBe(false);
  });

  it("non-admins see nothing", () => {
    expect(adminNav(null)).toEqual({ main: [], more: [] });
    expect(adminNav({ isMain: false, areas: [] })).toEqual({ main: [], more: [] });
  });
});

describe("audit diff", () => {
  it("lists changed fields and skips bookkeeping columns", () => {
    expect(
      changedFields(
        { areas: ["cr"], revoked_at: null, updated_at: "a", sync_version: 1 },
        { areas: ["cr", "users"], revoked_at: null, updated_at: "b", sync_version: 2 },
      ),
    ).toEqual([{ field: "areas", before: ["cr"], after: ["cr", "users"] }]);
  });

  it("handles inserts and deletes", () => {
    expect(changedFields(null, { key: "x", value: 1 })).toEqual([
      { field: "key", before: null, after: "x" },
      { field: "value", before: null, after: 1 },
    ]);
    expect(changedFields({ email: "a@b.c" }, null)).toEqual([
      { field: "email", before: "a@b.c", after: null },
    ]);
  });

  it("formats values", () => {
    expect(showValue(null)).toBe("—");
    expect(showValue("x")).toBe("x");
    expect(showValue(["a"])).toBe('["a"]');
  });
});

describe("admin errors", () => {
  it("maps database messages to text keys", () => {
    expect(adminErrorKey("Only the main administrator can manage admins")).toBe(
      "admins.err.notMain",
    );
    expect(adminErrorKey("Tick at least one area")).toBe("admins.err.areas");
    expect(adminErrorKey("Unknown area in {x}")).toBe("admins.err.areas");
    expect(adminErrorKey("Enter a valid email address")).toBe("admins.err.email");
    expect(adminErrorKey("Choose a signed-up, active account")).toBe("admins.err.account");
    expect(adminErrorKey("boom")).toBe("admins.err.generic");
  });
});

describe("settings link and menu", () => {
  const more = (areas: string[]) => slugs(adminNav({ isMain: false, areas }).more);
  const menu = (areas: string[]) => settingsMenu({ isMain: false, areas }).map((m) => m.slug);

  it("shows Settings to admins of the settings, routine or calendar area", () => {
    expect(more(["settings"])).toContain("settings");
    expect(more(["routine"])).toContain("settings");
    expect(more(["calendar"])).toContain("settings");
    expect(more(["notices", "cr"])).not.toContain("settings");
  });

  it("lists only the pages the admin may open", () => {
    expect(menu(["routine"])).toEqual(["semesters"]);
    expect(menu(["calendar"])).toEqual(["calendar"]);
    expect(menu(["routine", "calendar"])).toEqual(["semesters", "calendar"]);
    expect(menu(["settings"])).not.toContain("semesters");
    expect(menu(["settings"])).toContain("texts");
    expect(menu(["notices"])).toEqual([]);
  });

  it("links the calendar to its own page and everything else under /admin/settings", () => {
    const all = settingsMenu({ isMain: true, areas: [] });
    expect(all.find((m) => m.slug === "calendar")?.href).toBe("/admin/calendar");
    expect(all.find((m) => m.slug === "week")?.href).toBe("/admin/settings/week");
    expect(all.every((m) => m.href.startsWith("/admin/"))).toBe(true);
  });
});
