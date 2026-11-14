"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cx } from "@nfe/ui/web";
import { postJson } from "./post";

export interface DecisionButtonProps {
  /** Route under /api/admin/import/routine/. */
  path: "decide" | "cancel";
  body: unknown;
  label: string;
  variant?: "primary" | "secondary" | "link";
  /** Page to open afterwards (default: refresh this one). */
  then?: string;
  generic: string;
}

/** One review decision (accept, keep / rename lab groups, time slots, cancel) and a refresh. */
export function DecisionButton({
  path,
  body,
  label,
  variant = "secondary",
  then,
  generic,
}: DecisionButtonProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, start] = useTransition();
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          start(async () => {
            setError("");
            try {
              await postJson(`/api/admin/import/routine/${path}`, body);
              if (then) router.push(then);
              else router.refresh();
            } catch (e) {
              setError((e as Error).message || generic);
            }
          })
        }
        className={cx(
          "font-body text-small font-semibold disabled:opacity-50",
          variant === "link" ? "text-accent hover:underline" : "h-8 rounded-button px-3",
          variant === "primary" && "bg-accent text-on-accent hover:opacity-90",
          variant === "secondary" && "border border-border text-text hover:bg-surface-raised",
        )}
      >
        {label}
      </button>
      {error ? <span className="font-body text-caption text-danger">{error}</span> : null}
    </span>
  );
}
