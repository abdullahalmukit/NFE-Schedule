"use client";

import { useActionState } from "react";
import { cx } from "@nfe/ui/web";
import type { ActionResult } from "../settings/actions";
import { addCalendarDay, removeCalendarDay } from "./actions";

const input =
  "h-10 rounded-xl border border-border bg-surface px-3 font-body text-small text-text outline-none focus:border-accent";

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

export interface AddDayLabels {
  date: string;
  endDate: string;
  type: string;
  title: string;
  batches: string;
  save: string;
  types: { value: string; label: string }[];
}

export function AddCalendarDayForm(p: {
  batches: { id: string; code: string }[];
  defaultDate: string;
  labels: AddDayLabels;
}) {
  const [state, action, pending] = useActionState(addCalendarDay, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="font-body text-caption font-semibold text-text-muted">
            {p.labels.date}
          </span>
          <input type="date" name="date" required defaultValue={p.defaultDate} className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-body text-caption font-semibold text-text-muted">
            {p.labels.endDate}
          </span>
          <input type="date" name="end_date" className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-body text-caption font-semibold text-text-muted">
            {p.labels.type}
          </span>
          <select name="type" className={input} defaultValue="holiday">
            {p.labels.types.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1">
          <span className="font-body text-caption font-semibold text-text-muted">
            {p.labels.title}
          </span>
          <input name="title" className={cx(input, "min-w-48")} />
        </label>
      </div>
      {p.batches.length ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-body text-caption font-semibold text-text-muted">
            {p.labels.batches}
          </legend>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {p.batches.map((b) => (
              <label key={b.id} className="flex items-center gap-2 font-body text-small text-text">
                <input
                  type="checkbox"
                  name="batch_ids"
                  value={b.id}
                  className="h-4 w-4 accent-accent"
                />
                {b.code}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="h-10 rounded-button bg-accent px-4 font-body text-small font-semibold text-on-accent hover:opacity-90 disabled:opacity-50"
        >
          {p.labels.save}
        </button>
        <Result state={state} />
      </div>
    </form>
  );
}

export function RemoveCalendarDayForm({ id, label }: { id: string; label: string }) {
  const [state, action, pending] = useActionState(removeCalendarDay, null);
  return (
    <form action={action} className="flex items-center gap-3">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="font-body text-small font-semibold text-danger hover:underline disabled:opacity-50"
      >
        {label}
      </button>
      <Result state={state} />
    </form>
  );
}
