"use client";

import { useActionState } from "react";
import { Button, cx } from "@nfe/ui/web";
import {
  cancelInvite,
  inviteAdmin,
  revokeAdmin,
  saveAdminAreas,
  transferMainRole,
  type ActionResult,
} from "./actions";

export interface AreaOption {
  value: string;
  label: string;
}

const inputClass =
  "h-11 w-full rounded-xl border border-border bg-surface px-4 font-body text-body text-text outline-none placeholder:text-text-faint focus:border-accent";

function Result({ state }: { state: ActionResult | null }) {
  if (!state) return null;
  return (
    <p
      role="status"
      className={cx("font-body text-small font-semibold", state.ok ? "text-accent" : "text-danger")}
    >
      {state.message}
    </p>
  );
}

function AreaChecks({ areas, checked }: { areas: AreaOption[]; checked: readonly string[] }) {
  return (
    <div className="flex flex-wrap gap-x-5 gap-y-2">
      {areas.map((a) => (
        <label key={a.value} className="flex items-center gap-2 font-body text-small text-text">
          <input
            type="checkbox"
            name="areas"
            value={a.value}
            defaultChecked={checked.includes(a.value)}
            className="h-4 w-4 accent-accent"
          />
          {a.label}
        </label>
      ))}
    </div>
  );
}

export function InviteForm(p: {
  areas: AreaOption[];
  labels: { email: string; areas: string; send: string };
}) {
  const [state, action, pending] = useActionState(inviteAdmin, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="font-body text-small font-semibold text-text-muted">{p.labels.email}</span>
        <input
          name="email"
          type="email"
          required
          className={inputClass}
          placeholder="name@diu.edu.bd"
        />
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 font-body text-small font-semibold text-text-muted">
          {p.labels.areas}
        </legend>
        <AreaChecks areas={p.areas} checked={[]} />
      </fieldset>
      <div className="flex items-center gap-4">
        <Button label={p.labels.send} size="medium" type="submit" disabled={pending} />
        <Result state={state} />
      </div>
    </form>
  );
}

export function AdminAreasForm(p: {
  userId: string;
  areas: AreaOption[];
  checked: readonly string[];
  labels: { save: string; revoke: string };
}) {
  const [saveState, save, saving] = useActionState(saveAdminAreas, null);
  const [revokeState, revoke, revoking] = useActionState(revokeAdmin, null);
  return (
    <form action={save} className="flex flex-col gap-3">
      <input type="hidden" name="user" value={p.userId} />
      <AreaChecks areas={p.areas} checked={p.checked} />
      <div className="flex flex-wrap items-center gap-3">
        <Button label={p.labels.save} size="medium" type="submit" disabled={saving || revoking} />
        <button
          type="submit"
          formAction={revoke}
          disabled={saving || revoking}
          className="h-11 rounded-button border border-border px-4 font-body text-small font-semibold text-danger hover:bg-danger-soft disabled:opacity-50"
        >
          {p.labels.revoke}
        </button>
        <Result state={revokeState ?? saveState} />
      </div>
    </form>
  );
}

export function CancelInviteForm(p: { email: string; label: string }) {
  const [state, action, pending] = useActionState(cancelInvite, null);
  return (
    <form action={action} className="flex items-center gap-3">
      <input type="hidden" name="email" value={p.email} />
      <button
        type="submit"
        disabled={pending}
        className="font-body text-small font-semibold text-danger hover:underline disabled:opacity-50"
      >
        {p.label}
      </button>
      <Result state={state} />
    </form>
  );
}

export function TransferForm(p: { labels: { to: string; confirm: string; send: string } }) {
  const [state, action, pending] = useActionState(transferMainRole, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="font-body text-small font-semibold text-text-muted">{p.labels.to}</span>
        <input name="email" type="email" required className={inputClass} />
      </label>
      <label className="flex flex-col gap-2">
        <span className="font-body text-small font-semibold text-text-muted">
          {p.labels.confirm}
        </span>
        <input name="confirm" required className={inputClass} autoComplete="off" />
      </label>
      <div className="flex items-center gap-4">
        <Button
          label={p.labels.send}
          variant="secondary"
          size="medium"
          type="submit"
          disabled={pending}
        />
        <Result state={state} />
      </div>
    </form>
  );
}
