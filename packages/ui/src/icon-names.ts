/** Icon names used across the apps; each platform maps them to lucide icons. */
export const ICON_NAMES = [
  "home",
  "routine",
  "academics",
  "rooms",
  "menu",
  "search",
  "download",
  "bell",
  "user",
  "users",
  "pin",
  "phone",
  "mail",
  "back",
  "chevronRight",
  "chevronDown",
  "refresh",
  "alert",
  "contact",
  "notes",
  "check",
  "plus",
] as const;

export type IconName = (typeof ICON_NAMES)[number];
