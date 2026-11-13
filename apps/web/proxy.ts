import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@nfe/core";
import { publicSupabaseEnv } from "./lib/supabase/env";

/** Refreshes the Supabase session cookie on every page request. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, anonKey } = publicSupabaseEnv();
  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
      },
    },
  });
  // Validates the token with Supabase Auth and rotates it when needed.
  await supabase.auth.getUser();
  return response;
}

export const config = {
  // Skip static files, images and icons.
  matcher: ["/((?!_next/static|_next/image|icons/|icon.svg|apple-icon.png|favicon.ico).*)"],
};
