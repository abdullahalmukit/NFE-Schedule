import type { MessageKey } from "../i18n/en";

/** Permission areas the main admin can grant (same list as the database constraint). */
export const ADMIN_AREAS = [
  "routine",
  "courses",
  "faculty",
  "batches",
  "rooms",
  "notices",
  "cr",
  "calendar",
  "settings",
  "releases",
  "users",
  "reports",
] as const;

export type AdminArea = (typeof ADMIN_AREAS)[number];

export interface AdminAccess {
  isMain: boolean;
  areas: readonly string[];
}

export function isAdminArea(value: unknown): value is AdminArea {
  return typeof value === "string" && (ADMIN_AREAS as readonly string[]).includes(value);
}

/** Same rule as has_admin_area() in the database: the main admin has every area. */
export function hasArea(access: AdminAccess | null, area: AdminArea): boolean {
  return Boolean(access && (access.isMain || access.areas.includes(area)));
}

export function isAnyAdmin(access: AdminAccess | null): boolean {
  return Boolean(access && (access.isMain || access.areas.length > 0));
}

export interface AdminNavItem {
  /** Path segment under /admin ("" = dashboard). */
  slug: string;
  label: MessageKey;
  /** Area needed to see the link; null = any admin. */
  area: AdminArea | null;
  mainOnly?: boolean;
}

/** Top bar order from docs/SCREENS.md (admin panel). */
const MAIN_LINKS: AdminNavItem[] = [
  { slug: "routine", label: "admin.nav.routine", area: "routine" },
  { slug: "courses", label: "admin.nav.courses", area: "courses" },
  { slug: "faculty", label: "admin.nav.faculty", area: "faculty" },
  { slug: "batches", label: "admin.nav.batches", area: "batches" },
  { slug: "notices", label: "admin.nav.notices", area: "notices" },
  { slug: "rooms", label: "admin.nav.rooms", area: "rooms" },
  { slug: "cr-requests", label: "admin.nav.crRequests", area: "cr" },
];

const MORE_LINKS: AdminNavItem[] = [
  { slug: "calendar", label: "admin.nav.calendar", area: "calendar" },
  { slug: "users", label: "admin.nav.users", area: "users" },
  { slug: "reports", label: "admin.nav.reports", area: "reports" },
  { slug: "releases", label: "admin.nav.releases", area: "releases" },
  { slug: "settings", label: "admin.nav.settings", area: "settings" },
  { slug: "admins", label: "admin.nav.admins", area: null, mainOnly: true },
  { slug: "audit", label: "admin.nav.audit", area: null, mainOnly: true },
];

export const ADMIN_NAV: readonly AdminNavItem[] = [...MAIN_LINKS, ...MORE_LINKS];

export function canOpen(access: AdminAccess | null, item: AdminNavItem): boolean {
  if (!isAnyAdmin(access)) return false;
  if (item.mainOnly) return Boolean(access?.isMain);
  return item.area === null || hasArea(access, item.area);
}

/** Links an admin may see; areas they lack are hidden (UI only — RLS still guards the data). */
export function adminNav(access: AdminAccess | null): { main: AdminNavItem[]; more: AdminNavItem[] } {
  return {
    main: MAIN_LINKS.filter((i) => canOpen(access, i)),
    more: MORE_LINKS.filter((i) => canOpen(access, i)),
  };
}

export function findAdminNavItem(slug: string): AdminNavItem | undefined {
  return ADMIN_NAV.find((i) => i.slug === slug);
}
