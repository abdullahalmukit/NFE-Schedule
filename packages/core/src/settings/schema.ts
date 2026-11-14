/**
 * Every `app_settings` key (docs/ADMIN_CUSTOMIZATION.md §2): zod schema, safe
 * default, visibility, and the fields the admin form shows (A-16). The admin
 * form is built from `fields`; saving validates with `schema`. Code reads a
 * value with `readSetting()`, which falls back to the default when the stored
 * value is missing or invalid.
 */
import { z } from "zod";
import tokens from "../../../../design/tokens.json";
import type { MessageKey } from "../i18n/en";
import { AUTH_SIGNUP_DEFAULTS, authSignupSchema } from "./auth-signup";

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Use a colour written as #RRGGBB");
const email = z.string().trim().toLowerCase().email();
const day = z.number().int().min(0).max(6);
const unique = <T>(list: T[]) => new Set(list).size === list.length;

export const NAV_TABS = ["home", "routine", "academics", "rooms", "menu"] as const;
export const HOME_CARDS = ["next_class", "today", "exams", "deadlines", "version_banner"] as const;
export const NOTIFICATION_TEMPLATES = ["routine_published"] as const;

/** One editable field of a setting, addressed by a path inside the JSON value. */
export type SettingField =
  | {
      path: string[];
      kind: "text" | "textarea" | "email" | "color";
      label: MessageKey;
      nullable?: boolean;
    }
  | { path: string[]; kind: "bool"; label: MessageKey }
  | { path: string[]; kind: "int"; label: MessageKey; min: number; max: number }
  | {
      path: string[];
      kind: "select";
      label: MessageKey;
      options: { value: string; label: MessageKey }[];
    }
  /** Free list of short strings (domains, emails, numbers as text). */
  | { path: string[]; kind: "list"; label: MessageKey; itemKind: "text" | "email" | "int" }
  /** Fixed-length list, one input per item (day names). */
  | { path: string[]; kind: "fixedList"; label: MessageKey; itemLabels: MessageKey[] }
  /** Pick and order from a set (tabs, cards). */
  | {
      path: string[];
      kind: "order";
      label: MessageKey;
      options: { value: string; label: MessageKey }[];
    }
  /** Several of a set (working days). */
  | {
      path: string[];
      kind: "multi";
      label: MessageKey;
      options: { value: number; label: MessageKey }[];
    };

export interface SettingDefinition<T = unknown> {
  key: string;
  schema: z.ZodType<T>;
  default: T;
  /** Public keys reach guests and phones; private ones only admins. */
  isPublic: boolean;
  title: MessageKey;
  help: MessageKey;
  fields: SettingField[];
  /** Shown but not editable here (changed elsewhere). */
  readOnly?: boolean;
}

const DAY_LABELS: MessageKey[] = ["day.0", "day.1", "day.2", "day.3", "day.4", "day.5", "day.6"];

function define<T>(d: SettingDefinition<T>): SettingDefinition<T> {
  return d;
}

export const SETTINGS = {
  department: define({
    key: "department",
    schema: z.object({
      code: z.string().trim().min(1).max(12),
      name_en: z.string().trim().min(1),
      name_bn: z.string().trim().min(1),
      university: z.string().trim().min(1),
    }),
    default: {
      code: "NFE",
      name_en: "Nutrition and Food Engineering",
      name_bn: "নিউট্রিশন অ্যান্ড ফুড ইঞ্জিনিয়ারিং",
      university: "Daffodil International University",
    },
    isPublic: true,
    title: "set.department.title",
    help: "set.department.help",
    fields: [
      { path: ["code"], kind: "text", label: "set.department.code" },
      { path: ["name_en"], kind: "text", label: "set.department.nameEn" },
      { path: ["name_bn"], kind: "text", label: "set.department.nameBn" },
      { path: ["university"], kind: "text", label: "set.department.university" },
    ],
  }),
  branding: define({
    key: "branding",
    schema: z.object({
      app_name: z.string().trim().min(1).max(40),
      logo_path: z.string().trim().min(1).nullable(),
      accent_dark: hexColor,
      accent_light: hexColor,
    }),
    default: {
      app_name: "NFE Schedule",
      logo_path: null,
      accent_dark: tokens.color.dark.accent,
      accent_light: tokens.color.light.accent,
    },
    isPublic: true,
    title: "set.branding.title",
    help: "set.branding.help",
    fields: [
      { path: ["app_name"], kind: "text", label: "set.branding.appName" },
      { path: ["logo_path"], kind: "text", label: "set.branding.logoPath", nullable: true },
      { path: ["accent_dark"], kind: "color", label: "set.branding.accentDark" },
      { path: ["accent_light"], kind: "color", label: "set.branding.accentLight" },
    ],
  }),
  "i18n.default_locale": define({
    key: "i18n.default_locale",
    schema: z.enum(["en", "bn"]),
    default: "en" as "en" | "bn",
    isPublic: true,
    title: "set.locale.title",
    help: "set.locale.help",
    fields: [
      {
        path: [],
        kind: "select",
        label: "set.locale.title",
        options: [
          { value: "en", label: "lang.en" },
          { value: "bn", label: "lang.bn" },
        ],
      },
    ],
  }),
  "auth.signup": define({
    key: "auth.signup",
    schema: authSignupSchema,
    default: AUTH_SIGNUP_DEFAULTS,
    isPublic: true,
    title: "set.signup.title",
    help: "set.signup.help",
    fields: [
      {
        path: ["domain_mode"],
        kind: "select",
        label: "set.signup.domainMode",
        options: [
          { value: "restricted", label: "set.signup.restricted" },
          { value: "any", label: "set.signup.any" },
        ],
      },
      { path: ["allowed_domains"], kind: "list", label: "set.signup.domains", itemKind: "text" },
      { path: ["auto_register"], kind: "bool", label: "set.signup.autoRegister" },
      { path: ["google"], kind: "bool", label: "set.signup.google" },
      { path: ["email_otp"], kind: "bool", label: "set.signup.emailOtp" },
      { path: ["message_en"], kind: "textarea", label: "set.signup.messageEn" },
      { path: ["message_bn"], kind: "textarea", label: "set.signup.messageBn" },
    ],
  }),
  "auth.blocked_emails": define({
    key: "auth.blocked_emails",
    schema: z.array(email).refine(unique, "Each email once"),
    default: [] as string[],
    isPublic: false,
    title: "set.blocked.title",
    help: "set.blocked.help",
    fields: [{ path: [], kind: "list", label: "set.blocked.title", itemKind: "email" }],
  }),
  "auth.main_admin_email": define({
    key: "auth.main_admin_email",
    schema: email,
    default: "",
    isPublic: false,
    title: "set.mainAdmin.title",
    help: "set.mainAdmin.help",
    readOnly: true,
    fields: [{ path: [], kind: "email", label: "set.mainAdmin.title" }],
  }),
  week: define({
    key: "week",
    schema: z.object({
      start_day: day,
      working_days: z.array(day).min(1).refine(unique, "Each day once"),
      day_names_en: z.array(z.string().trim().min(1)).length(7),
      day_names_bn: z.array(z.string().trim().min(1)).length(7),
    }),
    default: {
      start_day: 0,
      working_days: [0, 1, 2, 3, 4, 5],
      day_names_en: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      day_names_bn: ["শনিবার", "রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার"],
    },
    isPublic: true,
    title: "set.week.title",
    help: "set.week.help",
    fields: [
      {
        path: ["start_day"],
        kind: "select",
        label: "set.week.startDay",
        options: DAY_LABELS.map((label, i) => ({ value: String(i), label })),
      },
      {
        path: ["working_days"],
        kind: "multi",
        label: "set.week.workingDays",
        options: DAY_LABELS.map((label, value) => ({ value, label })),
      },
      {
        path: ["day_names_en"],
        kind: "fixedList",
        label: "set.week.namesEn",
        itemLabels: DAY_LABELS,
      },
      {
        path: ["day_names_bn"],
        kind: "fixedList",
        label: "set.week.namesBn",
        itemLabels: DAY_LABELS,
      },
    ],
  }),
  "cr.policy": define({
    key: "cr.policy",
    schema: z.object({
      max_per_section: z.number().int().min(1).max(10),
      applications_open: z.boolean(),
      allow_any_section: z.boolean(),
      expire_with_semester: z.boolean(),
      require_message: z.boolean(),
    }),
    default: {
      max_per_section: 2,
      applications_open: true,
      allow_any_section: true,
      expire_with_semester: true,
      require_message: false,
    },
    isPublic: true,
    title: "set.cr.title",
    help: "set.cr.help",
    fields: [
      { path: ["max_per_section"], kind: "int", label: "set.cr.max", min: 1, max: 10 },
      { path: ["applications_open"], kind: "bool", label: "set.cr.open" },
      { path: ["allow_any_section"], kind: "bool", label: "set.cr.anySection" },
      { path: ["expire_with_semester"], kind: "bool", label: "set.cr.expire" },
      { path: ["require_message"], kind: "bool", label: "set.cr.requireMessage" },
    ],
  }),
  "guest.access": define({
    key: "guest.access",
    schema: z.object({ routine: z.boolean(), faculty_names: z.boolean(), rooms: z.boolean() }),
    default: { routine: true, faculty_names: true, rooms: true },
    isPublic: true,
    title: "set.guest.title",
    help: "set.guest.help",
    fields: [
      { path: ["routine"], kind: "bool", label: "set.guest.routine" },
      { path: ["faculty_names"], kind: "bool", label: "set.guest.faculty" },
      { path: ["rooms"], kind: "bool", label: "set.guest.rooms" },
    ],
  }),
  "nav.tabs": define({
    key: "nav.tabs",
    schema: z
      .array(z.enum(NAV_TABS))
      .refine(unique, "Each tab once")
      .refine((t) => t.includes("home") && t.includes("menu"), "Home and Menu are always kept"),
    default: [...NAV_TABS] as (typeof NAV_TABS)[number][],
    isPublic: true,
    title: "set.tabs.title",
    help: "set.tabs.help",
    fields: [
      {
        path: [],
        kind: "order",
        label: "set.tabs.title",
        options: NAV_TABS.map((v) => ({ value: v, label: `tab.${v}` as MessageKey })),
      },
    ],
  }),
  "home.cards": define({
    key: "home.cards",
    schema: z.array(z.enum(HOME_CARDS)).refine(unique, "Each card once"),
    default: [...HOME_CARDS] as (typeof HOME_CARDS)[number][],
    isPublic: true,
    title: "set.cards.title",
    help: "set.cards.help",
    fields: [
      {
        path: [],
        kind: "order",
        label: "set.cards.title",
        options: HOME_CARDS.map((v) => ({ value: v, label: `card.${v}` as MessageKey })),
      },
    ],
  }),
  "notifications.templates": define({
    key: "notifications.templates",
    schema: z.record(
      z.enum(NOTIFICATION_TEMPLATES),
      z.object({ en: z.string().trim().min(1), bn: z.string().trim().min(1) }),
    ),
    default: {
      routine_published: {
        en: "Your class routine has changed. Tap to see what changed.",
        bn: "আপনার ক্লাস রুটিন পরিবর্তন হয়েছে। কী বদলেছে দেখতে ট্যাপ করুন।",
      },
    },
    isPublic: true,
    title: "set.templates.title",
    help: "set.templates.help",
    fields: [
      { path: ["routine_published", "en"], kind: "textarea", label: "set.templates.routineEn" },
      { path: ["routine_published", "bn"], kind: "textarea", label: "set.templates.routineBn" },
    ],
  }),
  reminders: define({
    key: "reminders",
    schema: z
      .object({
        options_minutes: z
          .array(z.number().int().min(1).max(180))
          .min(1)
          .refine(unique, "Each once"),
        default_minutes: z.number().int().min(0).max(180),
      })
      .refine(
        (r) => r.default_minutes === 0 || r.options_minutes.includes(r.default_minutes),
        "The default must be one of the choices (or 0 = off)",
      ),
    default: { options_minutes: [10, 15, 30], default_minutes: 15 },
    isPublic: true,
    title: "set.reminders.title",
    help: "set.reminders.help",
    fields: [
      { path: ["options_minutes"], kind: "list", label: "set.reminders.options", itemKind: "int" },
      { path: ["default_minutes"], kind: "int", label: "set.reminders.default", min: 0, max: 180 },
    ],
  }),
  changed_badge_days: define({
    key: "changed_badge_days",
    schema: z.number().int().min(0).max(60),
    default: 7,
    isPublic: true,
    title: "set.badge.title",
    help: "set.badge.help",
    fields: [{ path: [], kind: "int", label: "set.badge.title", min: 0, max: 60 }],
  }),
  "room.floor_rule": define({
    key: "room.floor_rule",
    schema: z.object({ mode: z.enum(["first_digit", "manual"]) }),
    default: { mode: "first_digit" as "first_digit" | "manual" },
    isPublic: true,
    title: "set.floor.title",
    help: "set.floor.help",
    fields: [
      {
        path: ["mode"],
        kind: "select",
        label: "set.floor.title",
        options: [
          { value: "first_digit", label: "set.floor.firstDigit" },
          { value: "manual", label: "set.floor.manual" },
        ],
      },
    ],
  }),
  sync: define({
    key: "sync",
    schema: z.object({
      background_minutes: z.number().int().min(15).max(1440),
      schema_version: z.number().int().min(1),
    }),
    default: { background_minutes: 60, schema_version: 1 },
    isPublic: true,
    title: "set.sync.title",
    help: "set.sync.help",
    fields: [
      { path: ["background_minutes"], kind: "int", label: "set.sync.minutes", min: 15, max: 1440 },
      { path: ["schema_version"], kind: "int", label: "set.sync.schema", min: 1, max: 1000 },
    ],
  }),
  support: define({
    key: "support",
    schema: z.object({ contact_email: email.nullable(), report_issue_enabled: z.boolean() }),
    default: { contact_email: null as string | null, report_issue_enabled: true },
    isPublic: true,
    title: "set.support.title",
    help: "set.support.help",
    fields: [
      { path: ["contact_email"], kind: "email", label: "set.support.email", nullable: true },
      { path: ["report_issue_enabled"], kind: "bool", label: "set.support.reports" },
    ],
  }),
  ota: define({
    key: "ota",
    schema: z.object({ force_restart_below: z.string().trim().min(1).nullable() }),
    default: { force_restart_below: null as string | null },
    isPublic: true,
    title: "set.ota.title",
    help: "set.ota.help",
    fields: [
      { path: ["force_restart_below"], kind: "text", label: "set.ota.below", nullable: true },
    ],
  }),
} as const;

export type SettingKey = keyof typeof SETTINGS;
export type SettingValue<K extends SettingKey> = (typeof SETTINGS)[K]["default"];

export function isSettingKey(key: string): key is SettingKey {
  return Object.prototype.hasOwnProperty.call(SETTINGS, key);
}

/** The stored value if it is valid, otherwise the default (never throws). */
export function readSetting<K extends SettingKey>(key: K, stored: unknown): SettingValue<K> {
  const def = SETTINGS[key] as SettingDefinition<SettingValue<K>>;
  if (stored === undefined || stored === null) return def.default;
  const merged =
    typeof def.default === "object" &&
    def.default !== null &&
    !Array.isArray(def.default) &&
    typeof stored === "object" &&
    !Array.isArray(stored)
      ? { ...def.default, ...stored }
      : stored;
  const parsed = def.schema.safeParse(merged);
  return parsed.success ? parsed.data : def.default;
}

/** Validates a value from the admin form before it is saved. */
export function validateSetting(
  key: SettingKey,
  value: unknown,
): { ok: true; value: unknown } | { ok: false; issues: string[] } {
  const parsed = (SETTINGS[key].schema as z.ZodType).safeParse(value);
  if (parsed.success) return { ok: true, value: parsed.data };
  return {
    ok: false,
    issues: parsed.error.issues.map((i) =>
      i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message,
    ),
  };
}

/** Settings pages of A-16 and the keys on each. */
export const SETTINGS_PAGES = [
  {
    slug: "general",
    title: "setp.general",
    keys: ["department", "branding", "i18n.default_locale", "support"],
  },
  {
    slug: "sign-in",
    title: "setp.signin",
    keys: ["auth.signup", "auth.blocked_emails", "auth.main_admin_email"],
  },
  { slug: "week", title: "setp.week", keys: ["week"] },
  { slug: "cr", title: "setp.cr", keys: ["cr.policy"] },
  { slug: "guest", title: "setp.guest", keys: ["guest.access"] },
  { slug: "home", title: "setp.home", keys: ["nav.tabs", "home.cards"] },
  { slug: "notifications", title: "setp.notifications", keys: ["notifications.templates"] },
  { slug: "reminders", title: "setp.reminders", keys: ["reminders", "changed_badge_days"] },
  { slug: "advanced", title: "setp.advanced", keys: ["room.floor_rule", "sync", "ota"] },
] as const satisfies readonly { slug: string; title: MessageKey; keys: readonly SettingKey[] }[];

/** Get a nested value: path [] = the whole value. */
export function getAt(value: unknown, path: readonly string[]): unknown {
  return path.reduce<unknown>(
    (v, k) => (v && typeof v === "object" ? (v as Record<string, unknown>)[k] : undefined),
    value,
  );
}

/** Copy of `value` with `path` set to `next` (path [] replaces the whole value). */
export function setAt(value: unknown, path: readonly string[], next: unknown): unknown {
  if (path.length === 0) return next;
  const [head, ...rest] = path as [string, ...string[]];
  const base =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  return { ...base, [head]: setAt(base[head], rest, next) };
}
