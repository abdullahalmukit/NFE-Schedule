import { NextResponse, type NextRequest } from "next/server";
import { GUEST_COOKIE } from "@/lib/app-state";
import { createClient } from "@/lib/supabase/server";

/**
 * Google sign-in returns here with `?code=` (or `?error_description=` when the
 * sign-up rule refused the account). The first sign-in creates the account.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const failure = searchParams.get("error_description") ?? searchParams.get("error");
  const code = searchParams.get("code");

  if (failure || !code) {
    const to = new URL("/sign-in", origin);
    to.searchParams.set("error", failure ?? "missing_code");
    return NextResponse.redirect(to);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const to = new URL("/sign-in", origin);
    to.searchParams.set("error", error.message);
    return NextResponse.redirect(to);
  }

  const response = NextResponse.redirect(new URL("/auth/next", origin));
  response.cookies.delete(GUEST_COOKIE);
  return response;
}
