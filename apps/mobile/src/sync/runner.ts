/** The app's one sync runner (outbox first, then pull), shared by every trigger. */
import { createSyncRunner, readSetting, type SyncOutcome } from "@nfe/core";
import { kvGet, kvSet, loadTable, resetData } from "./db";
import { emitChange } from "./events";
import { supabaseRemote } from "./remote";
import { sqliteStore } from "./store";

type OutcomeListener = (outcome: SyncOutcome) => void;
const outcomeListeners = new Set<OutcomeListener>();

export function onSyncDone(listener: OutcomeListener): () => void {
  outcomeListeners.add(listener);
  return () => outcomeListeners.delete(listener);
}

export const runSync = createSyncRunner(sqliteStore, supabaseRemote, (outcome) => {
  emitChange(outcome.changed);
  for (const l of outcomeListeners) l(outcome);
});

/**
 * A full re-download when the admin raises `app_settings.sync.schema_version`
 * (docs/SYNC_AND_OFFLINE.md §3). Called after a successful sync.
 */
export async function resyncIfSchemaChanged(): Promise<void> {
  const settings = await loadTable<{ key: string; value: unknown }>("app_settings");
  const server = readSetting("sync", settings.find((s) => s.key === "sync")?.value).schema_version;
  const stored = Number((await kvGet("server_schema_version")) ?? 0);
  if (server === stored) return;
  await kvSet("server_schema_version", String(server));
  if (stored > 0) {
    await resetData();
    await runSync("start");
  }
}
