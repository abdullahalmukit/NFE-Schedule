/** `SyncRemote` on Supabase: `sync_pull` for reading, plain upserts for the outbox. */
import type { OutboxItem, PullResult, SyncRemote, WriteResult } from "@nfe/core";
import { supabase } from "../lib/supabase";

/**
 * A PostgREST error with a code is the server refusing the write (row-level
 * security, a constraint, a bad value): retrying will not help, so the item is
 * dropped. No code (fetch failed) or a 5xx is the network: keep and retry.
 */
function classify(error: { code?: string; message: string } | null, status?: number): WriteResult {
  if (!error) return "ok";
  if (status && status >= 500) return "retry";
  return error.code ? "rejected" : "retry";
}

export const supabaseRemote: SyncRemote = {
  async pull(since: number): Promise<PullResult> {
    const { data, error } = await supabase.rpc("sync_pull", { p_since: since });
    if (error) throw new Error(error.message || "network");
    return data as unknown as PullResult;
  },

  async write(item: OutboxItem): Promise<WriteResult> {
    try {
      // The outbox tables are not in the generated client types' write shapes; rows are checked by RLS.
      const table = supabase.from(item.table as never) as unknown as {
        upsert: (
          v: unknown,
        ) => Promise<{ error: { code?: string; message: string } | null; status: number }>;
        update: (v: unknown) => {
          eq: (
            c: string,
            v: unknown,
          ) => Promise<{ error: { code?: string; message: string } | null; status: number }>;
        };
      };
      const res =
        item.op === "upsert"
          ? await table.upsert(item.payload)
          : await table.update({ deleted_at: new Date().toISOString() }).eq("id", item.payload.id);
      return classify(res.error, res.status);
    } catch {
      return "retry";
    }
  },
};
