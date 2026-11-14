"use client";

import { useState, useTransition } from "react";
import {
  fill,
  LINE_KINDS,
  patternProblem,
  RULE_PATTERNS,
  type RoutineRules,
  type RulePattern,
} from "@nfe/core";
import { cx } from "@nfe/ui/web";
import { inputClass } from "../../_components/fields";
import { saveRoutineRules } from "./actions";

type Labels = Record<string, string>;

export interface RoutineFormatFormProps {
  /** Stored rules, or null when the standard format is used. */
  stored: RoutineRules | null;
  defaults: RoutineRules;
  labels: Labels;
}

interface TestResult {
  stats: Record<string, number>;
  timeSlots: string[];
  problems: { severity: string; message: string }[];
}

const PATTERNS = Object.keys(RULE_PATTERNS) as RulePattern[];

const daysText = (days: Record<string, number>) =>
  Object.entries(days)
    .map(([k, v]) => `${k} = ${v}`)
    .join("\n");

function parseDays(text: string): Record<string, number> | null {
  const out: Record<string, number> = {};
  for (const line of text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)) {
    const m = line.match(/^(.{3,30}?)\s*=\s*([0-6])$/);
    if (!m) return null;
    out[m[1]!.trim().toLowerCase()] = Number(m[2]);
  }
  return Object.keys(out).length ? out : null;
}

/** ADM-RT-11: edit the patterns with plain-language labels, test on a sample file, then save. */
export function RoutineFormatForm({ stored, defaults, labels: l }: RoutineFormatFormProps) {
  const start0 = stored ?? defaults;
  const [useDefaults, setUseDefaults] = useState(stored === null);
  const [patterns, setPatterns] = useState<Record<RulePattern, string>>(
    Object.fromEntries(PATTERNS.map((p) => [p, start0[p]])) as Record<RulePattern, string>,
  );
  const [pm, setPm] = useState(String(start0.pmBeforeHour));
  const [days, setDays] = useState(daysText(start0.days));
  const [order, setOrder] = useState<string[]>([...start0.lineOrder]);
  const [file, setFile] = useState<File | null>(null);
  const [test, setTest] = useState<TestResult | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, start] = useTransition();

  const problems = Object.fromEntries(
    PATTERNS.map((p) => [p, useDefaults ? null : patternProblem(p, patterns[p])]),
  ) as Record<RulePattern, string | null>;
  const parsedDays = parseDays(days);
  const orderOk = new Set(order).size === 3;

  function rules(): RoutineRules | null {
    const source = useDefaults ? defaults : null;
    if (source) return source;
    if (PATTERNS.some((p) => problems[p]) || !parsedDays || !orderOk) return null;
    return {
      ...patterns,
      pmBeforeHour: Number(pm),
      days: parsedDays,
      lineOrder: order as RoutineRules["lineOrder"],
    };
  }

  function problemText(p: string) {
    return p === "invalid" ? l["rtf.err.invalid"]! : fill(l["rtf.err.group"]!, { g: p.slice(6) });
  }

  function save() {
    const r = rules();
    if (!r) return setMessage({ ok: false, text: l["rtf.err.rules"]! });
    start(async () => {
      const res = await saveRoutineRules(useDefaults ? { use_defaults: true } : r);
      setMessage({ ok: res.ok, text: res.message });
    });
  }

  function runTest() {
    const r = rules();
    if (!r) return setMessage({ ok: false, text: l["rtf.err.rules"]! });
    if (!file) return;
    start(async () => {
      setMessage(null);
      setTest(null);
      const form = new FormData();
      form.set("file", file);
      form.set("rules", JSON.stringify(r));
      const res = await fetch("/api/admin/routine/test-rules", { method: "POST", body: form });
      const json = (await res.json().catch(() => ({}))) as TestResult & { error?: string };
      if (!res.ok) setMessage({ ok: false, text: json.error ?? l["imp.err.generic"]! });
      else setTest(json);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <label className="flex items-center gap-2 font-body text-body text-text">
        <input
          type="checkbox"
          className="h-4 w-4 accent-accent"
          checked={useDefaults}
          onChange={(e) => setUseDefaults(e.target.checked)}
        />
        {l["rtf.useDefaults"]}
      </label>

      <fieldset disabled={useDefaults} className="flex flex-col gap-4 disabled:opacity-60">
        {PATTERNS.map((p) => (
          <label key={p} className="flex flex-col gap-1">
            <span className="font-body text-caption font-semibold text-text-muted">
              {l[`rtf.${p}`]}
            </span>
            <input
              className={cx(inputClass, "font-mono", problems[p] && "border-danger")}
              value={patterns[p]}
              spellCheck={false}
              onChange={(e) => setPatterns((s) => ({ ...s, [p]: e.target.value }))}
            />
            {problems[p] ? (
              <span className="font-body text-caption text-danger">
                {problemText(problems[p]!)}
              </span>
            ) : null}
          </label>
        ))}
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="font-body text-caption font-semibold text-text-muted">
              {l["rtf.pmBefore"]}
            </span>
            <input
              type="number"
              min={1}
              max={12}
              className={cx(inputClass, "w-24")}
              value={pm}
              onChange={(e) => setPm(e.target.value)}
            />
          </label>
          <div className="flex flex-col gap-1">
            <span className="font-body text-caption font-semibold text-text-muted">
              {l["rtf.lineOrder"]}
            </span>
            <div className="flex gap-2">
              {order.map((v, i) => (
                <select
                  key={i}
                  aria-label={`${l["rtf.lineOrder"]} ${i + 1}`}
                  className={cx(inputClass, "w-32", !orderOk && "border-danger")}
                  value={v}
                  onChange={(e) => setOrder((o) => o.map((x, j) => (j === i ? e.target.value : x)))}
                >
                  {LINE_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {l[`rtf.line.${k}`]}
                    </option>
                  ))}
                </select>
              ))}
            </div>
            {!orderOk ? (
              <span className="font-body text-caption text-danger">{l["rtf.err.lineOrder"]}</span>
            ) : null}
          </div>
        </div>
        <label className="flex flex-col gap-1">
          <span className="font-body text-caption font-semibold text-text-muted">
            {l["rtf.days"]}
          </span>
          <textarea
            className={cx(inputClass, "h-40 py-2 font-mono", !parsedDays && "border-danger")}
            value={days}
            onChange={(e) => setDays(e.target.value)}
          />
          {!parsedDays ? (
            <span className="font-body text-caption text-danger">{l["rtf.err.days"]}</span>
          ) : null}
        </label>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="h-10 rounded-button bg-accent px-4 font-body text-small font-semibold text-on-accent hover:opacity-90 disabled:opacity-50"
        >
          {l["rtf.save"]}
        </button>
        {message ? (
          <span
            role="status"
            className={cx(
              "font-body text-small font-semibold",
              message.ok ? "text-accent" : "text-danger",
            )}
          >
            {message.text}
          </span>
        ) : null}
      </div>

      <div className="rounded-card border border-border p-4">
        <h3 className="font-body text-body font-semibold text-text">{l["rtf.test"]}</h3>
        <p className="font-body text-small text-text-muted">{l["rtf.testHelp"]}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept=".docx"
            className="font-body text-small text-text"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            disabled={busy || !file}
            onClick={runTest}
            className="h-10 rounded-button border border-border px-4 font-body text-small font-semibold text-text hover:bg-surface-raised disabled:opacity-50"
          >
            {l["rtf.test"]}
          </button>
        </div>
        {test ? (
          <div className="mt-3 flex flex-col gap-1 font-body text-small">
            <p className="font-semibold text-text">
              {fill(l["rtf.result"]!, {
                tables: test.stats.tables ?? 0,
                classes: test.stats.classes ?? 0,
                labs: test.stats.labSessions ?? 0,
                codes: test.stats.courseCodes ?? 0,
                initials: test.stats.facultyInitials ?? 0,
                rooms: test.stats.rooms ?? 0,
                errors: test.stats.errors ?? 0,
                warnings: test.stats.warnings ?? 0,
              })}
            </p>
            <p className="text-text-muted">
              {fill(l["rtf.times"]!, { times: test.timeSlots.join(" · ") })}
            </p>
            <ul className="mt-1 flex flex-col gap-0.5">
              {test.problems.map((p, i) => (
                <li key={i} className={p.severity === "error" ? "text-danger" : "text-warning"}>
                  {p.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
