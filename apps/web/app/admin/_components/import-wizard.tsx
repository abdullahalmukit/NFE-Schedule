"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  fill,
  importObjectPath,
  MAX_IMPORT_BYTES,
  presetMapping,
  type ColumnMapping,
  type ImportOptions,
  type MasterField,
  type MasterKind,
  type RowStatus,
} from "@nfe/core";
import { cx, Panel, Pill, Stepper } from "@nfe/ui/web";
import { createClient } from "@/lib/supabase/client";
import { inputClass } from "./fields";

type Labels = Record<string, string>;

interface Preset {
  id: string;
  name: string;
  mapping: unknown;
}

interface ParseResult {
  runId: string;
  headers: string[];
  sample: string[][];
  rowCount: number;
  sheets: string[];
  sheet: string | null;
  page: number | null;
  mapping: ColumnMapping;
  presets: Preset[];
}

interface DisplayRow {
  line: number;
  key: string;
  status: RowStatus;
  notes: string[];
  changes: { label: string; from: string; to: string }[];
  values: { label: string; text: string }[];
}

interface PreviewResult {
  counts: Record<RowStatus, number>;
  newDepartments: string[];
  rows: DisplayRow[];
  applyCount: number;
  blocked: boolean;
}

interface ApplyResult {
  inserted: number;
  updated: number;
  departments: number;
  skipped: number;
  invalidCsv: string | null;
}

export interface ImportWizardProps {
  kind: MasterKind;
  /** Every `imp.*` text in the admin's language. */
  labels: Labels;
  fields: { field: MasterField; required: boolean; label: string }[];
  backHref: string;
}

const ACCEPT = ".csv,.xlsx,.xls,.json,.docx,.doc,.pdf";
const EXTENSIONS = ACCEPT.split(",");
const STATUS_TONE = {
  new: "accent",
  update: "info",
  unchanged: "neutral",
  invalid: "danger",
} as const;
const STATUSES: RowStatus[] = ["new", "update", "unchanged", "invalid"];

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`/api/admin/import/master/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(json.error ?? "");
  return json;
}

function download(name: string, text: string) {
  const bom = String.fromCharCode(0xfeff);
  const url = URL.createObjectURL(new Blob([bom + text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * A-7 Import wizard (ADM-MD-1, ADM-MD-2): Upload → Match columns → Preview → Apply.
 * The file goes straight from the browser to the private `imports` bucket; the
 * server reads it, and nothing reaches the live tables before Apply.
 */
export function ImportWizard({ kind, labels: l, fields, backHref }: ImportWizardProps) {
  const [step, setStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [presetId, setPresetId] = useState("");
  const [presetName, setPresetName] = useState("");
  const [options, setOptions] = useState<ImportOptions>({ clearEmpty: false, skipInvalid: true });
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [filter, setFilter] = useState<RowStatus | "all">("all");
  const [done, setDone] = useState<ApplyResult | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, start] = useTransition();

  const run = (task: () => Promise<void>) =>
    start(async () => {
      setMessage(null);
      try {
        await task();
      } catch (e) {
        setMessage({ ok: false, text: (e as Error).message || l["imp.err.generic"]! });
      }
    });

  function parse(f: File, sheet?: string, runId?: string) {
    run(async () => {
      let id = runId;
      if (!id) {
        id = crypto.randomUUID();
        const { error } = await createClient()
          .storage.from("imports")
          .upload(importObjectPath(id, f.name), f, { contentType: f.type || undefined });
        if (error) throw new Error(l["imp.err.upload"]);
      }
      const result = await post<ParseResult>("parse", {
        kind,
        runId: id,
        fileName: f.name,
        sheet,
      });
      setParsed(result);
      setMapping(result.mapping);
      setPresetId("");
      setPreview(null);
      setStep(1);
    });
  }

  function pick(f: File | undefined) {
    if (!f) return;
    const ext = f.name.toLowerCase().slice(f.name.lastIndexOf("."));
    if (!EXTENSIONS.includes(ext)) return setMessage({ ok: false, text: l["imp.upload.type"]! });
    if (f.size > MAX_IMPORT_BYTES) return setMessage({ ok: false, text: l["imp.upload.tooBig"]! });
    setFile(f);
    parse(f);
  }

  function loadPreview(opts = options) {
    if (!parsed) return;
    run(async () => {
      const result = await post<PreviewResult>("preview", {
        kind,
        runId: parsed.runId,
        mapping,
        options: opts,
      });
      setPreview(result);
      setFilter(result.counts.invalid ? "invalid" : "all");
      setStep(2);
    });
  }

  function apply() {
    if (!parsed) return;
    run(async () => {
      const result = await post<ApplyResult>("apply", {
        kind,
        runId: parsed.runId,
        mapping,
        options,
      });
      setDone(result);
      setStep(3);
    });
  }

  function savePreset() {
    run(async () => {
      const result = await post<{ presets: Preset[]; message: string }>("presets", {
        kind,
        name: presetName,
        mapping,
      });
      setParsed((p) => (p ? { ...p, presets: result.presets } : p));
      setPresetId(result.presets.find((p) => p.name === presetName.trim())?.id ?? "");
      setMessage({ ok: true, text: result.message });
    });
  }

  function choosePreset(id: string) {
    if (!parsed) return;
    setPresetId(id);
    const preset = parsed.presets.find((p) => p.id === id);
    setMapping(preset ? presetMapping(kind, parsed.headers, preset.mapping) : parsed.mapping);
  }

  function reset() {
    setStep(0);
    setFile(null);
    setParsed(null);
    setPreview(null);
    setDone(null);
    setMessage(null);
  }

  const steps = ["imp.step.upload", "imp.step.match", "imp.step.preview", "imp.step.apply"].map(
    (k) => l[k]!,
  );
  const button = "h-10 rounded-button px-4 font-body text-small font-semibold disabled:opacity-50";
  const primary = cx(button, "bg-accent text-on-accent hover:opacity-90");
  const secondary = cx(button, "border border-border text-text hover:bg-surface-raised");
  const rows = preview?.rows.filter((r) => filter === "all" || r.status === filter) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <Stepper steps={steps} current={step} />

      {message ? (
        <p
          role="status"
          className={cx(
            "font-body text-small font-semibold",
            message.ok ? "text-accent" : "text-danger",
          )}
        >
          {message.text}
        </p>
      ) : null}

      {step === 0 ? (
        <Panel title={l["imp.step.upload"]!} description={l["imp.upload.help"]}>
          <label
            className={cx(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-card border-2 border-dashed border-border p-10 text-center hover:border-accent",
              busy && "pointer-events-none opacity-60",
            )}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              pick(e.dataTransfer.files[0]);
            }}
          >
            <span className="font-body text-body font-semibold text-text">
              {busy ? l["imp.upload.reading"] : l["imp.upload.pick"]}
            </span>
            <span className="font-body text-small text-text-muted">{file?.name ?? ACCEPT}</span>
            <input
              type="file"
              accept={ACCEPT}
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                pick(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
        </Panel>
      ) : null}

      {step === 1 && parsed ? (
        <Panel
          title={l["imp.step.match"]!}
          description={l["imp.match.help"]}
          aside={<span className="font-body text-small text-text-muted">{file?.name}</span>}
        >
          <div className="flex flex-wrap items-end gap-4">
            {parsed.sheets.length > 1 ? (
              <label className="flex flex-col gap-1">
                <span className="font-body text-caption font-semibold text-text-muted">
                  {l["imp.match.sheet"]}
                </span>
                <select
                  className={cx(inputClass, "w-48")}
                  value={parsed.sheet ?? ""}
                  disabled={busy}
                  onChange={(e) => file && parse(file, e.target.value, parsed.runId)}
                >
                  {parsed.sheets.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="flex flex-col gap-1">
              <span className="font-body text-caption font-semibold text-text-muted">
                {l["imp.match.preset"]}
              </span>
              <select
                className={cx(inputClass, "w-56")}
                value={presetId}
                onChange={(e) => choosePreset(e.target.value)}
              >
                <option value="">{l["imp.match.auto"]}</option>
                {parsed.presets.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            {parsed.page ? (
              <span className="font-body text-small text-text-muted">
                {fill(l["imp.match.page"]!, { n: parsed.page })}
              </span>
            ) : null}
          </div>

          <table className="mt-4 w-full border-collapse font-body text-small">
            <thead>
              <tr className="border-b border-border text-left text-text-muted">
                <th className="py-2 pr-3 font-semibold">{l["imp.match.field"]}</th>
                <th className="py-2 font-semibold">{l["imp.match.column"]}</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((f) => (
                <tr key={f.field} className="border-b border-border last:border-b-0">
                  <td className="py-2 pr-3 font-semibold">
                    {f.label}
                    {f.required ? (
                      <span className="ml-2 font-normal text-text-muted">
                        ({l["imp.match.required"]})
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2">
                    <select
                      aria-label={f.label}
                      className={cx(inputClass, "max-w-sm")}
                      value={mapping[f.field] ?? ""}
                      onChange={(e) =>
                        setMapping((m) => {
                          const next = { ...m };
                          if (e.target.value) next[f.field] = e.target.value;
                          else delete next[f.field];
                          return next;
                        })
                      }
                    >
                      <option value="">{l["imp.match.none"]}</option>
                      {parsed.headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="mt-6 font-body text-small font-semibold text-text-muted">
            {fill(l["imp.match.sample"]!, { n: parsed.rowCount })}
          </h3>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full border-collapse font-body text-caption">
              <thead>
                <tr className="border-b border-border text-left text-text-muted">
                  {parsed.headers.map((h) => (
                    <th key={h} className="whitespace-nowrap py-1 pr-3 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsed.sample.map((r, i) => (
                  <tr key={i} className="border-b border-border last:border-b-0">
                    {parsed.headers.map((h, c) => (
                      <td key={h} className="whitespace-nowrap py-1 pr-3">
                        {r[c]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex flex-wrap items-end gap-3">
            <button type="button" className={secondary} disabled={busy} onClick={reset}>
              {l["imp.preview.back"]}
            </button>
            <button type="button" className={primary} disabled={busy} onClick={() => loadPreview()}>
              {l["imp.match.next"]}
            </button>
            <span className="grow" />
            <input
              className={cx(inputClass, "w-48")}
              value={presetName}
              maxLength={80}
              placeholder={l["imp.match.presetName"]}
              aria-label={l["imp.match.presetName"]}
              onChange={(e) => setPresetName(e.target.value)}
            />
            <button type="button" className={secondary} disabled={busy} onClick={savePreset}>
              {l["imp.match.savePreset"]}
            </button>
          </div>
        </Panel>
      ) : null}

      {step === 2 && preview ? (
        <Panel
          title={l["imp.step.preview"]!}
          aside={<span className="font-body text-small text-text-muted">{file?.name}</span>}
        >
          <div className="flex flex-wrap gap-2" role="tablist">
            {(["all", ...STATUSES] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="tab"
                aria-selected={filter === s}
                onClick={() => setFilter(s)}
                className={cx(
                  "rounded-lg border px-3 py-1 font-body text-small font-semibold",
                  filter === s
                    ? "border-accent text-text"
                    : "border-border text-text-muted hover:text-text",
                )}
              >
                {l[`imp.preview.${s}`]} {s === "all" ? preview.rows.length : preview.counts[s]}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-6">
            {(["clearEmpty", "skipInvalid"] as const).map((o) => (
              <label key={o} className="flex items-center gap-2 font-body text-small text-text">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-accent"
                  checked={options[o]}
                  disabled={busy}
                  onChange={(e) => {
                    const next = { ...options, [o]: e.target.checked };
                    setOptions(next);
                    loadPreview(next);
                  }}
                />
                {l[`imp.preview.${o}`]}
              </label>
            ))}
          </div>

          {preview.newDepartments.length ? (
            <p className="mt-4 font-body text-small text-warning">
              {fill(l["imp.preview.newDepartments"]!, {
                codes: preview.newDepartments.join(", "),
              })}
            </p>
          ) : null}

          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse font-body text-small">
              <thead>
                <tr className="border-b border-border text-left text-text-muted">
                  <th className="py-2 pr-3 font-semibold">{l["imp.preview.line"]}</th>
                  <th className="py-2 pr-3 font-semibold">{l["imp.preview.key"]}</th>
                  <th className="py-2 pr-3 font-semibold" />
                  <th className="py-2 font-semibold">{l["imp.preview.details"]}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.line} className="border-b border-border align-top last:border-b-0">
                    <td className="py-2 pr-3 text-text-muted">{r.line}</td>
                    <td className="py-2 pr-3 font-semibold">{r.key || "—"}</td>
                    <td className="py-2 pr-3">
                      <Pill
                        size="sm"
                        tone={STATUS_TONE[r.status]}
                        label={l[`imp.preview.${r.status}`]!}
                      />
                    </td>
                    <td className="py-2">
                      {r.notes.map((n) => (
                        <span
                          key={n}
                          className={cx(
                            "block",
                            r.status === "invalid" ? "text-danger" : "text-text-muted",
                          )}
                        >
                          {n}
                        </span>
                      ))}
                      {r.changes.map((c) => (
                        <span key={c.label} className="block">
                          <span className="text-text-muted">{c.label}: </span>
                          <span className="text-text-faint line-through">{c.from}</span>
                          {" → "}
                          <span className="font-semibold">{c.to}</span>
                        </span>
                      ))}
                      {r.values.length ? (
                        <span className="block text-text-muted">
                          {r.values.map((v) => `${v.label}: ${v.text}`).join(" · ")}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 ? (
              <p className="mt-4 font-body text-body text-text-muted">{l["imp.preview.noRows"]}</p>
            ) : null}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button type="button" className={secondary} disabled={busy} onClick={() => setStep(1)}>
              {l["imp.preview.back"]}
            </button>
            <button
              type="button"
              className={primary}
              disabled={busy || preview.blocked || preview.applyCount === 0}
              onClick={apply}
            >
              {fill(l["imp.preview.apply"]!, { n: preview.applyCount })}
            </button>
            {preview.blocked ? (
              <span className="font-body text-small text-danger">{l["imp.preview.blocked"]}</span>
            ) : preview.applyCount === 0 ? (
              <span className="font-body text-small text-text-muted">
                {l["imp.preview.nothing"]}
              </span>
            ) : null}
          </div>
        </Panel>
      ) : null}

      {step === 3 && done ? (
        <Panel title={l["imp.done.title"]!}>
          <p className="font-body text-body text-text">
            {fill(l["imp.done.summary"]!, {
              inserted: done.inserted,
              updated: done.updated,
              skipped: done.skipped,
            })}
          </p>
          {done.departments ? (
            <p className="mt-1 font-body text-small text-text-muted">
              {fill(l["imp.done.departments"]!, { n: done.departments })}
            </p>
          ) : null}
          <div className="mt-6 flex flex-wrap gap-3">
            {done.invalidCsv ? (
              <button
                type="button"
                className={secondary}
                onClick={() => download(`${kind}_invalid_rows.csv`, done.invalidCsv!)}
              >
                {l["imp.done.invalid"]}
              </button>
            ) : null}
            <button type="button" className={secondary} onClick={reset}>
              {l["imp.done.again"]}
            </button>
            <Link href={backHref} className={primary + " inline-flex items-center"}>
              {l["imp.done.back"]}
            </Link>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
