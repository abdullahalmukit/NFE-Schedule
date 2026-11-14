"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { GUEST_COOKIE } from "@/lib/app-state";
import { createClient } from "@/lib/supabase/server";

/** "Browse routine without signing in" (AUTH-2). */
export async function continueAsGuest() {
  (await cookies()).set(GUEST_COOKIE, "1", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(GUEST_COOKIE);
  redirect("/sign-in");
}
