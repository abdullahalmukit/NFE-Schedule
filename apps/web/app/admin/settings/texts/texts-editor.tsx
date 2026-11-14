"use client";

import { useMemo, useState, useTransition } from "react";
import { cx } from "@nfe/ui/web";
import { saveText, type ActionResult } from "../actions";

export interface TextRow {
  key: string;
  en: string;
  bn: string;
  overrideEn: string;
  overrideBn: string;
}

export interface TextsEditorProps {
  rows: TextRow[];
  labels: {
    search: string;
    key: string;
    builtIn: string;
    override: string;
    save: string;
    onlyChanged: string;
    changed: string;
  };
}

const input =
  "w-full rounded-xl border border-border bg-surface px-3 py-2 font-body text-small text-text outline-none placeholder:text-text-faint focus:border-accent";

function Row({ row, labels }: { row: TextRow; labels: TextsEditorProps["labels"] }) {
  const [en, setEn] = useState(row.overrideEn);
  const [bn, setBn] = useState(row.overrideBn);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [saving, start] = useTransition();
  const dirty = en !== row.overrideEn || bn !== row.overrideBn;

  return (
    <form
      className="grid gap-3 border-b border-border py-4 last:border-b-0 lg:grid-cols-[220px_1fr_1fr_auto]"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const results: ActionResult[] = [];
          if (en !== row.overrideEn)
            results.push(await saveText({ locale: "en", key: row.key, value: en }));
          if (bn !== row.overrideBn)
            results.push(await saveText({ locale: "bn", key: row.key, value: bn }));
          setResult(results.find((r) => !r.ok) ?? results[0] ?? null);
        });
      }}
    >
      <span className="break-all font-mono text-caption text-text-muted">{row.key}</span>
      <label className="flex flex-col gap-1">
        <span className="font-body text-caption text-text-faint">
          EN · {labels.builtIn}: {row.en}
        </span>
        <input
          className={input}
          value={en}
          placeholder={labels.override}
          aria-label={`${row.key} English`}
          onChange={(e) => setEn(e.target.value)}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-body text-caption text-text-faint">
          বাংলা · {labels.builtIn}: {row.bn}
        </span>
        <input
          className={input}
          value={bn}
          placeholder={labels.override}
          aria-label={`${row.key} Bangla`}
          onChange={(e) => setBn(e.target.value)}
        />
      </label>
      <div className="flex items-end gap-3">
        <button
          type="submit"
          disabled={!dirty || saving}
          className="h-10 rounded-button bg-accent px-4 font-body text-small font-semibold text-on-accent disabled:opacity-40"
        >
          {labels.save}
        </button>
        {result ? (
          <span
            role="status"
            className={cx(
              "font-body text-caption font-semibold",
              result.ok ? "text-accent" : "text-danger",
            )}
          >
            {result.message}
          </span>
        ) : null}
      </div>
    </form>
  );
}

/** Settings → Texts: search every app text and override it per language (i18n_overrides). */
export function TextsEditor({ rows, labels }: TextsEditorProps) {
  const [query, setQuery] = useState("");
  const [onlyChanged, setOnlyChanged] = useState(false);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (!onlyChanged || r.overrideEn || r.overrideBn) &&
        (!q ||
          [r.key, r.en, r.bn, r.overrideEn, r.overrideBn].some((s) => s.toLowerCase().includes(q))),
    );
  }, [rows, query, onlyChanged]);
  const changedCount = rows.filter((r) => r.overrideEn || r.overrideBn).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <input
          className={cx(input, "max-w-md")}
          type="search"
          value={query}
          placeholder={labels.search}
          aria-label={labels.search}
          onChange={(e) => setQuery(e.target.value)}
        />
        <label className="flex items-center gap-2 font-body text-small text-text">
          <input
            type="checkbox"
            className="h-4 w-4 accent-accent"
            checked={onlyChanged}
            onChange={(e) => setOnlyChanged(e.target.checked)}
          />
          {labels.onlyChanged}
        </label>
        <span className="font-body text-small text-text-muted">
          {labels.changed.replace("{n}", String(changedCount))}
        </span>
      </div>
      <div>
        {shown.map((r) => (
          <Row key={r.key} row={r} labels={labels} />
        ))}
      </div>
    </div>
  );
}
