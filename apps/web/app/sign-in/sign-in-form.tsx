"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { fill, t, type Locale, type MessageKey } from "@nfe/core";
import { Button, InfoBanner, Logo, SegmentedControl, TextField } from "@nfe/ui/web";
import { saveLocale } from "@/lib/locale";
import { createClient } from "@/lib/supabase/client";
import { continueAsGuest } from "../actions";

export interface SignInFormProps {
  locale: Locale;
  google: boolean;
  emailOtp: boolean;
  /** "Use your @diu.edu.bd email" when only listed domains may register. */
  hint: string | null;
  initialError: string | null;
  /** The admin's rejection message in this language, and the English text the hook sends. */
  refusalMessage: string;
  refusalMatch: string;
  /** Admin text changes for this language. */
  overrides: Partial<Record<MessageKey, string>>;
}

type EmailStep = "closed" | "email" | "code";

export function SignInForm(p: SignInFormProps) {
  const router = useRouter();
  const tr = (key: MessageKey) => t(p.locale, key, p.overrides);
  const [error, setError] = useState(p.initialError);
  const [busy, startBusy] = useTransition();
  const [step, setStep] = useState<EmailStep>("closed");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");

  function explain(message: string | undefined) {
    if (typeof navigator !== "undefined" && !navigator.onLine) return tr("auth.errorOffline");
    if (message && message.toLowerCase().includes(p.refusalMatch.toLowerCase())) {
      return p.refusalMessage;
    }
    return tr("auth.errorGeneric");
  }

  function changeLanguage(next: Locale) {
    startBusy(async () => {
      await saveLocale(next);
      router.refresh();
    });
  }

  function signInWithGoogle() {
    setError(null);
    startBusy(async () => {
      const onlyDomain = p.hint && !p.hint.includes("/") ? p.hint.match(/@([^\s]+)/)?.[1] : null;
      const { error: err } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          // Google shows only accounts of that domain when there is exactly one.
          queryParams: onlyDomain
            ? { hd: onlyDomain, prompt: "select_account" }
            : { prompt: "select_account" },
        },
      });
      if (err) setError(explain(err.message));
    });
  }

  function sendCode() {
    setError(null);
    startBusy(async () => {
      const { error: err } = await createClient().auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: true },
      });
      if (err) setError(explain(err.message));
      else setStep("code");
    });
  }

  function verifyCode() {
    setError(null);
    startBusy(async () => {
      const { error: err } = await createClient().auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: "email",
      });
      if (err)
        setError(
          err.status === 403 && !err.message.includes(p.refusalMatch)
            ? tr("auth.errorCode")
            : explain(err.message),
        );
      else router.replace("/auth/next");
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-8">
      <div className="flex items-center justify-between gap-4">
        <p className="font-body text-caption font-semibold uppercase tracking-[0.06em] text-accent">
          {tr("auth.step1")}
        </p>
        <div className="w-44">
          <SegmentedControl<Locale>
            label={tr("lang.label")}
            value={p.locale}
            onChange={changeLanguage}
            options={[
              { value: "en", label: t("en", "lang.en") },
              { value: "bn", label: t("bn", "lang.bn") },
            ]}
          />
        </div>
      </div>

      <div className="flex flex-col items-start gap-4">
        <div className="flex items-center gap-3">
          <Logo size={56} />
          <h1 className="font-display text-title font-bold">{tr("app.name")}</h1>
        </div>
        <p className="font-body text-body text-text-muted">{tr("auth.intro")}</p>
      </div>

      {error ? <InfoBanner icon="alert" tone="warning" title={error} /> : null}

      <div className="flex flex-col gap-3">
        {p.google ? (
          <>
            <Button label={tr("auth.google")} onClick={signInWithGoogle} disabled={busy} />
            <p className="text-center font-body text-small text-text-muted">
              {p.hint ? `${p.hint} · ` : ""}
              {tr("auth.firstTime")}
            </p>
          </>
        ) : null}

        {p.emailOtp ? (
          step === "closed" ? (
            <Button
              label={tr("auth.emailCode")}
              variant="secondary"
              icon="mail"
              onClick={() => setStep("email")}
              disabled={busy}
            />
          ) : step === "email" ? (
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                sendCode();
              }}
            >
              <TextField
                type="email"
                label={tr("auth.emailLabel")}
                placeholder={tr("auth.emailLabel")}
                value={email}
                onChange={setEmail}
                icon="mail"
              />
              <Button
                label={tr("auth.sendCode")}
                variant="secondary"
                type="submit"
                disabled={busy || !email.includes("@")}
              />
            </form>
          ) : (
            <form
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                verifyCode();
              }}
            >
              <p className="font-body text-small text-text-muted">
                {fill(tr("auth.codeSent"), { email })}
              </p>
              <TextField
                type="number"
                label={tr("auth.codeLabel")}
                placeholder={tr("auth.codeLabel")}
                value={code}
                onChange={setCode}
              />
              <Button
                label={tr("auth.verify")}
                type="submit"
                disabled={busy || code.trim().length < 6}
              />
              <button
                type="button"
                className="font-body text-small font-semibold text-accent"
                onClick={() => {
                  setStep("email");
                  setCode("");
                }}
              >
                {tr("auth.changeEmail")}
              </button>
            </form>
          )
        ) : null}
      </div>

      <div className="mt-auto flex flex-col items-center gap-3">
        <div className="flex w-full items-center gap-3 text-text-faint">
          <span className="h-px flex-1 bg-border" />
          <span className="font-body text-small">{tr("auth.or")}</span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <form action={continueAsGuest} className="w-full">
          <Button label={tr("auth.guest")} variant="secondary" type="submit" />
        </form>
      </div>
    </div>
  );
}
