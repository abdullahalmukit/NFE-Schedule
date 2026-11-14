"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { fill } from "@nfe/core";
import { postJson } from "./post";

/** "Save as draft": writes the draft version (apply_routine_import). */
export function SaveDraft(p: {
  runId: string;
  label: string;
  disabled: boolean;
  labels: { save: string; saved: string; backHome: string; generic: string };
}) {
  const [done, setDone] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [busy, start] = useTransition();
  if (done !== null) {
    return (
      <span className="flex flex-wrap items-center gap-3">
        <span role="status" className="font-body text-small font-semibold text-accent">
          {fill(p.labels.saved, { label: p.label, n: done })}
        </span>
        <Link
          href="/admin/routine"
          className="inline-flex h-10 items-center rounded-button bg-accent px-4 font-body text-small font-semibold text-on-accent"
        >
          {p.labels.backHome}
        </Link>
      </span>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-3">
      {error ? (
        <span className="font-body text-small font-semibold text-danger">{error}</span>
      ) : null}
      <button
        type="button"
        disabled={p.disabled || busy}
        onClick={() =>
          start(async () => {
            setError("");
            try {
              const r = await postJson<{ classes: number }>("/api/admin/import/routine/apply", {
                runId: p.runId,
              });
              setDone(r.classes);
            } catch (e) {
              setError((e as Error).message || p.labels.generic);
            }
          })
        }
        className="h-10 rounded-button bg-accent px-4 font-body text-small font-semibold text-on-accent hover:opacity-90 disabled:opacity-50"
      >
        {p.labels.save}
      </button>
    </span>
  );
}
