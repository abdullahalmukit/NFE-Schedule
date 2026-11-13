/**
 * The Supabase client needs the project origin only
 * ("https://<ref>.supabase.co"). Dashboards also show endpoint URLs such as
 * ".../rest/v1/"; pasted into the env by mistake, every Auth call would hit the
 * REST gateway ("No API key found in request"). Keep just the origin.
 */
export function supabaseProjectUrl(raw: string): string {
  const url = new URL(raw.trim());
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`Supabase URL must start with https:// (got ${url.protocol})`);
  }
  return url.origin;
}
