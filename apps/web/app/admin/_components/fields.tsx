import type { ReactNode } from "react";
import { cx } from "@nfe/ui/web";

/** Plain form fields for the admin pages (server-renderable, uncontrolled). */

export const inputClass =
  "h-10 w-full rounded-xl border border-border bg-surface px-3 font-body text-small text-text outline-none placeholder:text-text-faint focus:border-accent";

function Label({
  text,
  children,
  className,
}: {
  text: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cx("flex flex-col gap-1", className)}>
      <span className="font-body text-caption font-semibold text-text-muted">{text}</span>
      {children}
    </label>
  );
}

export function TextField(p: {
  name: string;
  label: string;
  defaultValue?: string | number | null;
  required?: boolean;
  type?: "text" | "email" | "tel" | "date" | "number";
  placeholder?: string;
  className?: string;
  step?: string;
}) {
  return (
    <Label text={p.label} className={p.className}>
      <input
        name={p.name}
        type={p.type ?? "text"}
        required={p.required}
        step={p.step}
        placeholder={p.placeholder}
        defaultValue={p.defaultValue ?? ""}
        className={inputClass}
      />
    </Label>
  );
}

export function TextArea(p: { name: string; label: string; defaultValue?: string | null }) {
  return (
    <Label text={p.label}>
      <textarea
        name={p.name}
        defaultValue={p.defaultValue ?? ""}
        className={cx(inputClass, "h-20 py-2")}
      />
    </Label>
  );
}

export function SelectField(p: {
  name: string;
  label: string;
  defaultValue?: string | null;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <Label text={p.label} className={p.className}>
      <select name={p.name} defaultValue={p.defaultValue ?? ""} className={inputClass}>
        {p.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Label>
  );
}

export function CheckboxField(p: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 font-body text-small text-text">
      <input
        type="checkbox"
        name={p.name}
        defaultChecked={p.defaultChecked}
        className="h-4 w-4 accent-accent"
      />
      {p.label}
    </label>
  );
}

export function Hidden({ name, value }: { name: string; value: string }) {
  return <input type="hidden" name={name} value={value} />;
}
