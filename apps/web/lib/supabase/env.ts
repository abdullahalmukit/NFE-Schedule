/** Public Supabase settings (safe in the browser). Values come from apps/web/.env.local or Vercel. */
export function publicSupabaseEnv(): { url: string; anonKey: string } {
  // Written out in full so Next.js can inline them into the browser bundle.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY (apps/web/.env.local)",
    );
  }
  return { url, anonKey };
}
