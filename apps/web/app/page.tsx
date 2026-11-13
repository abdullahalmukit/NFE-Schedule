import Link from "next/link";
import { redirect } from "next/navigation";
import { fill, t } from "@nfe/core";
import { Button, Card, InfoBanner, Logo } from "@nfe/ui/web";
import { getAppState } from "@/lib/app-state";
import { signOut } from "./actions";

/**
 * Home. Until the routine screens arrive (student-home, student-routine) it
 * shows who is looking: guest, pending or signed-in account.
 */
export default async function HomePage() {
  const { stage, locale, user } = await getAppState();
  if (stage === "sign-in") redirect("/sign-in");
  if (stage === "disabled") redirect("/pending");
  const tr = (key: Parameters<typeof t>[1]) => t(locale, key);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col gap-6 px-5 py-8">
      <div className="flex items-center gap-3">
        <Logo size={48} />
        <div>
          <h1 className="font-display text-title font-bold">{tr("app.name")}</h1>
          <p className="font-body text-small text-text-muted">{tr("app.tagline")}</p>
        </div>
      </div>

      {stage === "pending" ? (
        <Link href="/pending">
          <InfoBanner icon="alert" tone="warning" title={tr("home.pending")} />
        </Link>
      ) : null}

      <Card>
        <p className="font-body text-body text-text-muted">{tr("home.routineSoon")}</p>
      </Card>

      {stage === "guest" ? (
        <div className="flex flex-col gap-3">
          <p className="font-body text-small text-text-muted">{tr("home.guest")}</p>
          <Link
            href="/sign-in"
            className="inline-flex h-14 w-full items-center justify-center rounded-button bg-accent px-5 font-body text-body font-semibold text-on-accent hover:opacity-90"
          >
            {tr("home.signIn")}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="font-body text-small text-text-muted">
            {fill(tr("home.signedInAs"), { email: user?.email ?? "" })}
          </p>
          <form action={signOut}>
            <Button label={tr("auth.signOut")} variant="secondary" type="submit" />
          </form>
        </div>
      )}
    </main>
  );
}
