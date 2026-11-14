"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { cx } from "@nfe/ui/web";

export interface ActionResult {
  ok: boolean;
  message: string;
}

export type FormAction = (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;

export interface ActionFormProps {
  action: FormAction;
  /** Server-rendered inputs. */
  children: ReactNode;
  submitLabel: string;
  /** Clear the inputs after a successful save (forms that add something new). */
  resetOnSuccess?: boolean;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
}

const buttonClass = {
  primary: "bg-accent text-on-accent hover:opacity-90",
  secondary: "border border-border text-text hover:bg-surface-raised",
  danger: "border border-border text-danger hover:bg-danger-soft",
};

/** A form posting to a server action, with a pending state and the result message. */
export function ActionForm({
  action,
  children,
  submitLabel,
  resetOnSuccess,
  variant = "primary",
  className,
}: ActionFormProps) {
  const [state, run, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={run} className={cx("flex flex-col gap-4", className)}>
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className={cx(
            "h-10 rounded-button px-4 font-body text-small font-semibold disabled:opacity-50",
            buttonClass[variant],
          )}
        >
          {submitLabel}
        </button>
        {state ? (
          <span
            role="status"
            className={cx(
              "font-body text-small font-semibold",
              state.ok ? "text-accent" : "text-danger",
            )}
          >
            {state.message}
          </span>
        ) : null}
      </div>
    </form>
  );
}
