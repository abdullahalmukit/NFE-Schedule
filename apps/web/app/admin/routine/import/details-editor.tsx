"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { fill } from "@nfe/core";
import { cx, Pill } from "@nfe/ui/web";
import { inputClass } from "../../_components/fields";
import { postJson } from "./post";

export interface DetailsRow {
  /** Initial or course code. */
  key: string;
  /** Department code (faculty) — sent back unchanged. */
  department?: string | null;
  /** Second column: classes / week, or the detected type. */
  info: string;
  /** Small grey note beside the key: "Guest · ITM", "prefixed code". */
  note?: string;
  isNew: boolean;
  /** Course type sent with the details ("theory" / "lab"). */
  type?: string;
}

export interface DetailsEditorProps {
  kind: "faculty" | "courses";
  runId: string;
  rows: DetailsRow[];
  /** Column headers: key, info, first input, second input. */
  columns: [string, string, string, string];
  labels: {
    new: string;
    showAll: string;
    showLess: string;
    save: string;
    saved: string;
    generic: string;
  };
}

const VISIBLE = 8;

/**
 * "Faculty initials without details" / "Course codes without titles" (mockup 8):
 * fill names or titles inline; saved to master data at once (ADM-RT-2).
 */
export function DetailsEditor({ kind, runId, rows, columns, labels: l }: DetailsEditorProps) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, [string, string]>>({});
  const [all, setAll] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, start] = useTransition();
  const shown = all ? rows : rows.slice(0, VISIBLE);
  const set = (key: string, i: 0 | 1, v: string) =>
    setValues((s) => {
      const cur = s[key] ?? ["", ""];
      return { ...s, [key]: i === 0 ? [v, cur[1]] : [cur[0], v] };
    });

  function save() {
    const filled = rows.filter((r) => values[r.key]?.some((v) => v.trim()));
    start(async () => {
      setMessage(null);
      try {
        const payload =
          kind === "faculty"
            ? filled.map((r) => ({
                initial: r.key,
                department: r.department ?? "",
                full_name: values[r.key]![0],
                designation: values[r.key]![1],
              }))
            : filled.map((r) => ({
                code: r.key,
                title: values[r.key]![0],
                credit: values[r.key]![1],
                type: r.type ?? "",
              }));
        const res = await postJson<{ saved: number }>("/api/admin/import/routine/details", {
          kind,
          runId,
          rows: payload,
        });
        setValues({});
        setMessage({ ok: true, text: fill(l.saved, { n: res.saved }) });
        router.refresh();
      } catch (e) {
        setMessage({ ok: false, text: (e as Error).message || l.generic });
      }
    });
  }

  return (
    <div>
      <table className="w-full border-collapse font-body text-small">
        <thead>
          <tr className="border-b border-border text-left text-text-muted">
            {columns.map((c) => (
              <th key={c} className="py-2 pr-3 font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((r) => (
            <tr key={r.key} className="border-b border-border last:border-b-0">
              <td className="py-2 pr-3">
                <span className="font-semibold">{r.key}</span>
                {r.note ? (
                  <span className="block text-caption text-text-muted">{r.note}</span>
                ) : null}
              </td>
              <td className="py-2 pr-3 text-text-muted">{r.info}</td>
              <td className="py-2 pr-3">
                <input
                  aria-label={`${columns[2]} ${r.key}`}
                  className={cx(inputClass, "h-9")}
                  value={values[r.key]?.[0] ?? ""}
                  onChange={(e) => set(r.key, 0, e.target.value)}
                />
              </td>
              <td className="py-2">
                <div className="flex items-center gap-2">
                  <input
                    aria-label={`${columns[3]} ${r.key}`}
                    className={cx(inputClass, "h-9", kind === "courses" && "w-20")}
                    value={values[r.key]?.[1] ?? ""}
                    onChange={(e) => set(r.key, 1, e.target.value)}
                  />
                  {r.isNew ? <Pill size="sm" tone="accent" label={l.new} /> : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {rows.length > VISIBLE ? (
          <button
            type="button"
            className="font-body text-small font-semibold text-accent"
            onClick={() => setAll((a) => !a)}
          >
            {all ? l.showLess : fill(l.showAll, { n: rows.length })}
          </button>
        ) : null}
        <span className="grow" />
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
        <button
          type="button"
          disabled={busy || !Object.values(values).some((v) => v.some((x) => x.trim()))}
          onClick={save}
          className="h-9 rounded-button border border-border px-3 font-body text-small font-semibold text-text hover:bg-surface-raised disabled:opacity-50"
        >
          {l.save}
        </button>
      </div>
    </div>
  );
}
