import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@nfe/core";
import { publicSupabaseEnv } from "./env";

/** Supabase client for Client Components (anon key + the user's session cookie). */
export function createClient() {
  const { url, anonKey } = publicSupabaseEnv();
  return createBrowserClient<Database>(url, anonKey);
}
