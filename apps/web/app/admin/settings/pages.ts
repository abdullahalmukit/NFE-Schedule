import { SETTINGS_PAGES, type AdminArea, type MessageKey } from "@nfe/core";

/** Side menu of Settings (A-16) and the area each page needs. */
export const SETTINGS_MENU: { slug: string; title: MessageKey; area: AdminArea }[] = [
  ...SETTINGS_PAGES.map((p) => ({ slug: p.slug, title: p.title, area: "settings" as const })),
  { slug: "semesters", title: "setp.semesters", area: "routine" },
  { slug: "routine", title: "setp.routine", area: "settings" },
  { slug: "features", title: "setp.features", area: "settings" },
  { slug: "texts", title: "setp.texts", area: "settings" },
];
