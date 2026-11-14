"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { postJson } from "./post";

/** "Mark graduated when published" for a batch without a table (ADM-RT-10). */
export function GraduateToggle(p: { runId: string; batch: string; on: boolean; label: string }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  return (
    <label className="flex items-center gap-2 font-body text-caption text-text-muted">
      <input
        type="checkbox"
        className="h-4 w-4 accent-accent"
        checked={p.on}
        disabled={busy}
        onChange={(e) =>
          start(async () => {
            await postJson("/api/admin/import/routine/decide", {
              runId: p.runId,
              action: { kind: "graduate", batch: p.batch, on: e.target.checked },
            }).catch(() => undefined);
            router.refresh();
          })
        }
      />
      {p.label}
    </label>
  );
}
