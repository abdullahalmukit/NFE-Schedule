"use client";

import { useActionState } from "react";
import { cx } from "@nfe/ui/web";
import type { ActionResult } from "../actions";
import { activateSemester, archiveSemester, removeSlot, saveSemester, saveSlot } from "./actions";

const input =
  "h-10 rounded-xl border border-border bg-surface px-3 font-body text-small text-text outline-none focus:border-accent";
const primary =
  "h-10 rounded-button bg-accent px-4 font-body text-small font-semibold text-on-accent hover:opacity-90 disabled:opacity-50";
const secondary =
  "h-10 rounded-button border border-border px-4 font-body text-small font-semibold text-text hover:bg-surface-raised disabled:opacity-50";

function Result({ state }: { state: ActionResult | null }) {
  if (!state) return null;
  return (
    <span
      role="status"
      className={cx("font-body text-small font-semibold", state.ok ? "text-accent" : "text-danger")}
    >
      {state.message}
    </span>
  );
}

export interface SemesterLabels {
  name: string;
  starts: string;
  ends: string;
  save: string;
  add: string;
  makeActive: string;
  archive: string;
}

export function SemesterForm(p: {
  semester?: {
    id: string;
    name: string;
    starts_on: string | null;
    ends_on: string | null;
    is_active: boolean;
  };
  labels: SemesterLabels;
}) {
  const [state, save, saving] = useActionState(saveSemester, null);
  const [actState, activate, activating] = useActionState(activateSemester, null);
  const [arcState, archive, archiving] = useActionState(archiveSemester, null);
  const s = p.semester;
  const busy = saving || activating || archiving;
  return (
    <form action={save} className="flex flex-wrap items-end gap-3">
      {s ? <input type="hidden" name="id" value={s.id} /> : null}
      <label className="flex flex-col gap-1">
        <span className="font-body text-caption font-semibold text-text-muted">
          {p.labels.name}
        </span>
        <input
          name="name"
          required
          defaultValue={s?.name}
          className={cx(input, "w-40")}
          placeholder="Spring 2027"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-body text-caption font-semibold text-text-muted">
          {p.labels.starts}
        </span>
        <input type="date" name="starts_on" defaultValue={s?.starts_on ?? ""} className={input} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-body text-caption font-semibold text-text-muted">
          {p.labels.ends}
        </span>
        <input type="date" name="ends_on" defaultValue={s?.ends_on ?? ""} className={input} />
      </label>
      <button type="submit" className={primary} disabled={busy}>
        {s ? p.labels.save : p.labels.add}
      </button>
      {s && !s.is_active ? (
        <>
          <button type="submit" formAction={activate} className={secondary} disabled={busy}>
            {p.labels.makeActive}
          </button>
          <button
            type="submit"
            formAction={archive}
            className={cx(secondary, "text-danger")}
            disabled={busy}
          >
            {p.labels.archive}
          </button>
        </>
      ) : null}
      <Result state={arcState ?? actState ?? state} />
    </form>
  );
}

export interface SlotLabels {
  position: string;
  start: string;
  end: string;
  label: string;
  save: string;
  add: string;
  remove: string;
}

export function SlotForm(p: {
  semesterId: string;
  slot?: {
    id: string;
    position: number;
    start_time: string;
    end_time: string;
    label: string | null;
  };
  nextPosition?: number;
  labels: SlotLabels;
}) {
  const [state, save, saving] = useActionState(saveSlot, null);
  const [remState, remove, removing] = useActionState(removeSlot, null);
  const s = p.slot;
  return (
    <form action={save} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="semester_id" value={p.semesterId} />
      {s ? <input type="hidden" name="id" value={s.id} /> : null}
      <label className="flex flex-col gap-1">
        <span className="font-body text-caption font-semibold text-text-muted">
          {p.labels.position}
        </span>
        <input
          type="number"
          name="position"
          min={1}
          max={20}
          required
          readOnly={Boolean(s)}
          defaultValue={s?.position ?? p.nextPosition}
          className={cx(input, "w-16")}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-body text-caption font-semibold text-text-muted">
          {p.labels.start}
        </span>
        <input
          type="time"
          name="start_time"
          required
          defaultValue={s?.start_time.slice(0, 5)}
          className={input}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-body text-caption font-semibold text-text-muted">{p.labels.end}</span>
        <input
          type="time"
          name="end_time"
          required
          defaultValue={s?.end_time.slice(0, 5)}
          className={input}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-body text-caption font-semibold text-text-muted">
          {p.labels.label}
        </span>
        <input name="label" defaultValue={s?.label ?? ""} className={cx(input, "w-32")} />
      </label>
      <button type="submit" className={s ? secondary : primary} disabled={saving || removing}>
        {s ? p.labels.save : p.labels.add}
      </button>
      {s ? (
        <button
          type="submit"
          formAction={remove}
          className={cx(secondary, "text-danger")}
          disabled={saving || removing}
        >
          {p.labels.remove}
        </button>
      ) : null}
      <Result state={remState ?? state} />
    </form>
  );
}
