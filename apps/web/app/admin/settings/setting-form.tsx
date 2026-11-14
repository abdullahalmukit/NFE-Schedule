"use client";

import { useState, useTransition } from "react";
import { getAt, setAt } from "@nfe/core";
import { tokens } from "@nfe/ui";
import { Button, cx, Panel } from "@nfe/ui/web";
import { saveSetting, type ActionResult } from "./actions";

/** A setting field with its labels already translated on the server. */
export type ClientField =
  | {
      path: string[];
      kind: "text" | "textarea" | "email" | "color";
      label: string;
      nullable?: boolean;
    }
  | { path: string[]; kind: "bool"; label: string }
  | { path: string[]; kind: "int"; label: string; min: number; max: number }
  | { path: string[]; kind: "select"; label: string; options: { value: string; label: string }[] }
  | { path: string[]; kind: "list"; label: string; itemKind: "text" | "email" | "int" }
  | { path: string[]; kind: "fixedList"; label: string; itemLabels: string[] }
  | { path: string[]; kind: "order"; label: string; options: { value: string; label: string }[] }
  | { path: string[]; kind: "multi"; label: string; options: { value: number; label: string }[] };

export interface SettingFormProps {
  settingKey: string;
  title: string;
  help: string;
  fields: ClientField[];
  initial: unknown;
  readOnly?: boolean;
  readOnlyNote?: string;
  labels: { save: string; add: string; remove: string; up: string; down: string };
}

const input =
  "h-11 w-full rounded-xl border border-border bg-surface px-3 font-body text-body text-text outline-none placeholder:text-text-faint focus:border-accent disabled:opacity-60";
const smallButton =
  "rounded-lg border border-border px-2 py-1 font-body text-caption font-semibold text-text-muted hover:text-text disabled:opacity-40";

function FieldLabel({ text }: { text: string }) {
  return <span className="font-body text-small font-semibold text-text-muted">{text}</span>;
}

/** Admin form for one app_settings key, built from its field list (A-16). */
export function SettingForm(p: SettingFormProps) {
  const [value, setValue] = useState<unknown>(p.initial);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [saving, startSaving] = useTransition();
  const disabled = Boolean(p.readOnly) || saving;
  const set = (path: string[], next: unknown) => setValue((v: unknown) => setAt(v, path, next));

  function renderField(f: ClientField) {
    const current = getAt(value, f.path);
    const id = `${p.settingKey}-${f.path.join("-") || "value"}`;
    switch (f.kind) {
      case "text":
      case "email":
      case "color":
      case "textarea": {
        const text = typeof current === "string" ? current : "";
        const onChange = (v: string) => set(f.path, f.nullable && v.trim() === "" ? null : v);
        return (
          <label key={id} className="flex flex-col gap-2">
            <FieldLabel text={f.label} />
            {f.kind === "textarea" ? (
              <textarea
                className={cx(input, "h-24 py-2")}
                value={text}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
              />
            ) : (
              <div className="flex items-center gap-3">
                {f.kind === "color" ? (
                  <input
                    type="color"
                    aria-label={f.label}
                    value={/^#[0-9a-f]{6}$/i.test(text) ? text : tokens.brand.ink}
                    disabled={disabled}
                    onChange={(e) => onChange(e.target.value.toUpperCase())}
                    className="h-11 w-14 rounded-xl border border-border bg-surface"
                  />
                ) : null}
                <input
                  type={f.kind === "email" ? "email" : "text"}
                  className={input}
                  value={text}
                  disabled={disabled}
                  onChange={(e) => onChange(e.target.value)}
                />
              </div>
            )}
          </label>
        );
      }
      case "bool":
        return (
          <label key={id} className="flex items-center gap-3 font-body text-body text-text">
            <input
              type="checkbox"
              className="h-5 w-5 accent-accent"
              checked={current === true}
              disabled={disabled}
              onChange={(e) => set(f.path, e.target.checked)}
            />
            {f.label}
          </label>
        );
      case "int":
        return (
          <label key={id} className="flex flex-col gap-2">
            <FieldLabel text={f.label} />
            <input
              type="number"
              className={cx(input, "w-40")}
              min={f.min}
              max={f.max}
              value={typeof current === "number" ? current : ""}
              disabled={disabled}
              onChange={(e) => set(f.path, e.target.value === "" ? null : Number(e.target.value))}
            />
          </label>
        );
      case "select": {
        const numeric = typeof current === "number";
        return (
          <label key={id} className="flex flex-col gap-2">
            <FieldLabel text={f.label} />
            <select
              className={cx(input, "w-auto")}
              value={String(current ?? "")}
              disabled={disabled}
              onChange={(e) => set(f.path, numeric ? Number(e.target.value) : e.target.value)}
            >
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        );
      }
      case "multi": {
        const list = Array.isArray(current) ? (current as number[]) : [];
        return (
          <fieldset key={id} className="flex flex-col gap-2">
            <legend className="mb-2">
              <FieldLabel text={f.label} />
            </legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {f.options.map((o) => (
                <label
                  key={o.value}
                  className="flex items-center gap-2 font-body text-small text-text"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-accent"
                    checked={list.includes(o.value)}
                    disabled={disabled}
                    onChange={(e) =>
                      set(
                        f.path,
                        e.target.checked
                          ? [...list, o.value].sort((a, b) => a - b)
                          : list.filter((x) => x !== o.value),
                      )
                    }
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </fieldset>
        );
      }
      case "fixedList": {
        const list = Array.isArray(current) ? (current as string[]) : [];
        return (
          <fieldset key={id} className="flex flex-col gap-2">
            <legend className="mb-2">
              <FieldLabel text={f.label} />
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {f.itemLabels.map((itemLabel, i) => (
                <input
                  key={itemLabel}
                  aria-label={`${f.label}: ${itemLabel}`}
                  placeholder={itemLabel}
                  className={input}
                  value={list[i] ?? ""}
                  disabled={disabled}
                  onChange={(e) => {
                    const next = [...list];
                    next[i] = e.target.value;
                    set(f.path, next);
                  }}
                />
              ))}
            </div>
          </fieldset>
        );
      }
      case "list":
        return (
          <ListField
            key={id}
            field={f}
            value={current}
            disabled={disabled}
            labels={p.labels}
            onChange={(v) => set(f.path, v)}
          />
        );
      case "order":
        return (
          <OrderField
            key={id}
            field={f}
            value={current}
            disabled={disabled}
            labels={p.labels}
            onChange={(v) => set(f.path, v)}
          />
        );
    }
  }

  return (
    <Panel title={p.title} description={p.help}>
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          startSaving(async () => setResult(await saveSetting(p.settingKey, value)));
        }}
      >
        {p.fields.map(renderField)}
        {p.readOnly ? (
          <p className="font-body text-small text-text-muted">{p.readOnlyNote}</p>
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <Button label={p.labels.save} size="medium" type="submit" disabled={disabled} />
            {result ? (
              <p
                role="status"
                className={cx(
                  "font-body text-small font-semibold",
                  result.ok ? "text-accent" : "text-danger",
                )}
              >
                {result.message}
              </p>
            ) : null}
          </div>
        )}
      </form>
    </Panel>
  );
}

function ListField({
  field,
  value,
  disabled,
  labels,
  onChange,
}: {
  field: Extract<ClientField, { kind: "list" }>;
  value: unknown;
  disabled: boolean;
  labels: SettingFormProps["labels"];
  onChange: (v: unknown[]) => void;
}) {
  const list = Array.isArray(value) ? (value as (string | number)[]) : [];
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    onChange([
      ...list,
      field.itemKind === "int" ? Number(v) : field.itemKind === "email" ? v.toLowerCase() : v,
    ]);
    setDraft("");
  };
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel text={field.label} />
      <div className="flex flex-wrap gap-2">
        {list.map((item, i) => (
          <span
            key={`${item}-${i}`}
            className="inline-flex items-center gap-2 rounded-lg bg-surface-raised px-3 py-1.5 font-body text-small text-text"
          >
            {String(item)}
            <button
              type="button"
              aria-label={`${labels.remove} ${String(item)}`}
              disabled={disabled}
              className="font-bold text-text-muted hover:text-danger"
              onClick={() => onChange(list.filter((_, j) => j !== i))}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className={cx(input, "max-w-xs")}
          type={field.itemKind === "int" ? "number" : field.itemKind === "email" ? "email" : "text"}
          value={draft}
          disabled={disabled}
          aria-label={field.label}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <button type="button" className={smallButton} disabled={disabled} onClick={add}>
          {labels.add}
        </button>
      </div>
    </div>
  );
}

function OrderField({
  field,
  value,
  disabled,
  labels,
  onChange,
}: {
  field: Extract<ClientField, { kind: "order" }>;
  value: unknown;
  disabled: boolean;
  labels: SettingFormProps["labels"];
  onChange: (v: string[]) => void;
}) {
  const chosen = Array.isArray(value) ? (value as string[]) : [];
  const rest = field.options.filter((o) => !chosen.includes(o.value));
  const labelOf = (v: string) => field.options.find((o) => o.value === v)?.label ?? v;
  const move = (i: number, d: -1 | 1) => {
    const next = [...chosen];
    const j = i + d;
    [next[i], next[j]] = [next[j]!, next[i]!];
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel text={field.label} />
      <ol className="flex flex-col gap-2">
        {chosen.map((v, i) => (
          <li key={v} className="flex items-center gap-3 rounded-xl border border-border px-3 py-2">
            <input
              type="checkbox"
              className="h-4 w-4 accent-accent"
              checked
              disabled={disabled}
              aria-label={labelOf(v)}
              onChange={() => onChange(chosen.filter((x) => x !== v))}
            />
            <span className="flex-1 font-body text-body text-text">{labelOf(v)}</span>
            <button
              type="button"
              className={smallButton}
              disabled={disabled || i === 0}
              onClick={() => move(i, -1)}
            >
              ↑ <span className="sr-only">{labels.up}</span>
            </button>
            <button
              type="button"
              className={smallButton}
              disabled={disabled || i === chosen.length - 1}
              onClick={() => move(i, 1)}
            >
              ↓ <span className="sr-only">{labels.down}</span>
            </button>
          </li>
        ))}
        {rest.map((o) => (
          <li
            key={o.value}
            className="flex items-center gap-3 rounded-xl border border-dashed border-border px-3 py-2"
          >
            <input
              type="checkbox"
              className="h-4 w-4 accent-accent"
              checked={false}
              disabled={disabled}
              aria-label={o.label}
              onChange={() => onChange([...chosen, o.value])}
            />
            <span className="flex-1 font-body text-body text-text-muted">{o.label}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
