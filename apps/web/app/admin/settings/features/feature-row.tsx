"use client";

import { useState, useTransition } from "react";
import { Button, cx } from "@nfe/ui/web";
import { saveFeature, type ActionResult } from "../actions";

const ROLES = ["guest", "student", "cr", "faculty", "admin"] as const;
type Role = (typeof ROLES)[number];

export interface FeatureRowProps {
  flagKey: string;
  name: string;
  enabled: boolean;
  roles: string[];
  minAppVersion: string | null;
  labels: { enabled: string; roles: string; minVersion: string; save: string } & Record<
    Role,
    string
  >;
}

export function FeatureRow(p: FeatureRowProps) {
  const [enabled, setEnabled] = useState(p.enabled);
  const [roles, setRoles] = useState<string[]>(p.roles);
  const [min, setMin] = useState(p.minAppVersion ?? "");
  const [result, setResult] = useState<ActionResult | null>(null);
  const [saving, start] = useTransition();

  return (
    <form
      className="flex flex-col gap-3 border-b border-border py-4 last:border-b-0"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () =>
          setResult(
            await saveFeature({
              key: p.flagKey,
              enabled,
              roles: roles.filter((r): r is Role => (ROLES as readonly string[]).includes(r)),
              min_app_version: min,
            }),
          ),
        );
      }}
    >
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-3 font-body text-body font-semibold text-text">
          <input
            type="checkbox"
            className="h-5 w-5 accent-accent"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            aria-label={`${p.name}: ${p.labels.enabled}`}
          />
          {p.name}
        </label>
        <span className="font-mono text-caption text-text-faint">{p.flagKey}</span>
      </div>
      <div className="flex flex-wrap items-end gap-6">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-body text-small font-semibold text-text-muted">
            {p.labels.roles}
          </legend>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {ROLES.map((r) => (
              <label key={r} className="flex items-center gap-2 font-body text-small text-text">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-accent"
                  checked={roles.includes(r)}
                  onChange={(e) =>
                    setRoles((list) =>
                      e.target.checked ? [...list, r] : list.filter((x) => x !== r),
                    )
                  }
                />
                {p.labels[r]}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex flex-col gap-1">
          <span className="font-body text-small font-semibold text-text-muted">
            {p.labels.minVersion}
          </span>
          <input
            className="h-10 w-32 rounded-xl border border-border bg-surface px-3 font-body text-small text-text outline-none focus:border-accent"
            value={min}
            placeholder="1.2.0"
            onChange={(e) => setMin(e.target.value)}
          />
        </label>
        <Button label={p.labels.save} size="medium" type="submit" disabled={saving} />
        {result ? (
          <span
            role="status"
            className={cx(
              "font-body text-small font-semibold",
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
