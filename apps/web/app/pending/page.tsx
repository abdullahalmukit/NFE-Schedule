import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { fill, t } from "@nfe/core";
import { Button, Card, Logo } from "@nfe/ui/web";
import { getAppState, pathForStage } from "@/lib/app-state";
import { signOut } from "../actions";
import { RecheckStatus } from "./recheck-status";

export const metadata: Metadata = { title: "Waiting for approval · NFE Schedule" };

/** N-17 Waiting for approval (AUTH-8); also shown for disabled accounts. */
export default async function PendingPage() {
  const { stage, locale, user } = await getAppState();
  if (stage !== "pending" && stage !== "disabled") redirect(pathForStage(stage));
  const disabled = stage === "disabled";
  const tr = (key: Parameters<typeof t>[1]) => t(locale, key);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col gap-6 px-5 py-8">
      <Logo size={56} />
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-display font-bold">
          {tr(disabled ? "disabled.title" : "pending.title")}
        </h1>
        <p className="font-body text-body text-text-muted">
          {tr(disabled ? "disabled.body" : "pending.body")}
        </p>
      </div>
      <Card>
        <p className="font-body text-small text-text-muted">
          {fill(tr("pending.signedInAs"), { email: user?.email ?? "" })}
        </p>
      </Card>
      <div className="mt-auto flex flex-col gap-3">
        <Link
          href="/"
          className="inline-flex h-14 w-full items-center justify-center rounded-button bg-accent px-5 font-body text-body font-semibold text-on-accent hover:opacity-90"
        >
          {tr("pending.browse")}
        </Link>
        {disabled ? null : <RecheckStatus label={tr("pending.checkAgain")} />}
        <form action={signOut}>
          <Button label={tr("auth.signOut")} variant="secondary" type="submit" />
        </form>
      </div>
    </main>
  );
}
