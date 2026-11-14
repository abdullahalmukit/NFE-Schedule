import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { bn } from "../src/i18n/bn";
import { en } from "../src/i18n/en";
import {
  getAt,
  isSettingKey,
  readSetting,
  setAt,
  SETTINGS,
  SETTINGS_PAGES,
  validateSetting,
  type SettingKey,
} from "../src/settings/schema";

const keys = Object.keys(SETTINGS) as SettingKey[];

/** Seeds from supabase/migrations/..._storage_and_defaults.sql: ('key', 'json', ...). */
function seededValues(): Map<string, unknown> {
  const sql = readFileSync(
    fileURLToPath(
      new URL(
        "../../../supabase/migrations/20261113000004_storage_and_defaults.sql",
        import.meta.url,
      ),
    ),
    "utf8",
  );
  const block = sql.slice(
    sql.indexOf("insert into public.app_settings"),
    sql.indexOf("insert into public.feature_flags"),
  );
  const out = new Map<string, unknown>();
  for (const m of block.matchAll(/\('([a-z_.]+)',\s*'((?:[^']|'')*)'/g)) {
    out.set(m[1]!, JSON.parse(m[2]!.replace(/''/g, "'")));
  }
  return out;
}

describe("settings registry", () => {
  it("every default is valid", () => {
    for (const k of keys) {
      if (k === "auth.main_admin_email") continue; // set per installation
      expect(validateSetting(k, SETTINGS[k].default).ok, k).toBe(true);
    }
  });

  it("every value seeded by the migration is valid (missing fields fall back)", () => {
    const seeded = seededValues();
    expect(seeded.size).toBeGreaterThan(10);
    for (const [k, v] of seeded) {
      if (!isSettingKey(k) || k === "auth.main_admin_email") continue;
      const read = readSetting(k, v);
      expect(validateSetting(k, read).ok, k).toBe(true);
      if (k !== "sync") expect(read, k).toEqual(v); // sync gains schema_version from the default
    }
  });

  it("every key is on exactly one settings page", () => {
    const listed = SETTINGS_PAGES.flatMap((p) => [...p.keys]);
    expect([...listed].sort()).toEqual([...keys].sort());
  });

  it("every label exists in both languages", () => {
    for (const k of keys) {
      const d = SETTINGS[k];
      const labels: string[] = [d.title, d.help];
      for (const f of d.fields) {
        labels.push(f.label);
        if ("options" in f) labels.push(...f.options.map((o) => o.label));
        if ("itemLabels" in f) labels.push(...f.itemLabels);
      }
      for (const l of labels) {
        expect(l in en, `${k}: ${l}`).toBe(true);
        expect(l in bn, `${k}: ${l}`).toBe(true);
      }
    }
  });
});

describe("readSetting / validateSetting", () => {
  it("falls back to the default for missing or invalid values", () => {
    expect(readSetting("changed_badge_days", null)).toBe(7);
    expect(readSetting("changed_badge_days", "seven")).toBe(7);
    expect(readSetting("cr.policy", { max_per_section: 3 }).max_per_section).toBe(3);
    expect(readSetting("cr.policy", { max_per_section: 99 })).toEqual(
      SETTINGS["cr.policy"].default,
    );
  });

  it("keeps Home and Menu in the tabs and the reminder default among the choices", () => {
    expect(validateSetting("nav.tabs", ["home", "routine"]).ok).toBe(false);
    expect(validateSetting("nav.tabs", ["home", "menu"]).ok).toBe(true);
    expect(validateSetting("reminders", { options_minutes: [10], default_minutes: 15 }).ok).toBe(
      false,
    );
    expect(validateSetting("reminders", { options_minutes: [10], default_minutes: 0 }).ok).toBe(
      true,
    );
  });

  it("explains what is wrong", () => {
    const r = validateSetting("week", { ...SETTINGS.week.default, working_days: [] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.issues[0]).toMatch(/working_days/);
  });
});

describe("getAt / setAt", () => {
  it("reads and writes nested paths without changing the original", () => {
    const v = { a: { b: 1 }, c: 2 };
    expect(getAt(v, ["a", "b"])).toBe(1);
    expect(getAt(v, [])).toBe(v);
    const next = setAt(v, ["a", "b"], 5);
    expect(next).toEqual({ a: { b: 5 }, c: 2 });
    expect(v.a.b).toBe(1);
    expect(setAt(v, [], 9)).toBe(9);
  });
});
