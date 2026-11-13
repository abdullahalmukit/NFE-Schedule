import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@nfe/core";
import { publicSupabaseEnv } from "./env";

/**
 * Service-role client: bypasses row-level security. Server code only (route
 * handlers for imports, publish, cron) and only after checking the caller's
 * admin area with the normal server client. Never import this from a client file.
 */
export function createAdminClient() {
  const { url } = publicSupabaseEnv();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY (server environment only)");
  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
