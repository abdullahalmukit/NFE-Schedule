import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { domainHint, fill, isSignupRefusal, rejectionMessage } from "@nfe/core";
import { getAppState, pathForStage } from "@/lib/app-state";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in · NFE Schedule" };

/** N-1 Welcome / sign-in (AUTH-1, AUTH-2, AUTH-9). */
export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { stage, locale, signup, overrides, tr } = await getAppState();
  if (stage !== "sign-in" && stage !== "guest") redirect(pathForStage(stage));

  const { error } = await searchParams;
  const hint = domainHint(signup);
  const errorText = error
    ? isSignupRefusal(signup, error)
      ? rejectionMessage(signup, locale)
      : tr("auth.errorGeneric")
    : null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col px-5 py-8">
      <SignInForm
        locale={locale}
        google={signup.google}
        emailOtp={signup.email_otp}
        hint={hint ? fill(tr("auth.domainHint"), { domains: hint }) : null}
        overrides={overrides}
        initialError={errorText}
        refusalMessage={rejectionMessage(signup, locale)}
        refusalMatch={signup.message_en}
      />
    </main>
  );
}
