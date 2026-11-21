/**
 * Phone sync engine (SYNC-1 … SYNC-4; docs/SYNC_AND_OFFLINE.md §3), written
 * against two small interfaces so it runs and is tested without a device:
 * `SyncStore` is the local database (expo-sqlite on the phone), `SyncRemote`
 * is Supabase (`rpc('sync_pull')` and plain upserts for the outbox).
 */

export type Row = Record<string, unknown>;

/** Tables returned by `sync_pull`, in the same order (supabase/migrations/…_functions.sql). */
export const SYNC_TABLES = [
  "app_settings",
  "feature_flags",
  "i18n_overrides",
  "departments",
  "semesters",
  "time_slots",
  "batches",
  "sections",
  "lab_groups",
  "courses",
  "faculty_directory",
  "buildings",
  "rooms",
  "calendar_days",
  "routine_versions",
  "class_slots",
  "class_exceptions",
  "notices",
  "academic_events",
  "section_crs",
  "app_releases",
  "extra_enrolments",
  "attendance_records",
  "notes",
] as const;

export type SyncTable = (typeof SYNC_TABLES)[number];

/** Personal tables the owner may change offline; everything else needs a connection (SYNC-3). */
export const OUTBOX_TABLES = [
  "attendance_records",
  "notes",
  "extra_enrolments",
  "notification_reads",
] as const;

export type OutboxTable = (typeof OUTBOX_TABLES)[number];

/** Local primary key of a synced row ("id" for most tables). */
export function rowKey(table: string, row: Row): string {
  switch (table) {
    case "app_settings":
    case "feature_flags":
      return String(row.key);
    case "i18n_overrides":
      return `${String(row.locale)}|${String(row.key)}`;
    case "section_crs":
      return `${String(row.section_id)}|${String(row.semester_id)}|${String(row.user_id)}`;
    default:
      return String(row.id);
  }
}

export interface TableChanges {
  table: string;
  /** Rows to insert or replace (live rows). */
  upserts: { key: string; row: Row }[];
  /** Keys of rows deleted on the server (tombstones). */
  deletes: string[];
}

export interface PullResult {
  server_version: number;
  me: Row | null;
  [table: string]: unknown;
}

/** Splits a `sync_pull` answer into upserts and tombstones per table. */
export function splitPull(result: PullResult): TableChanges[] {
  return SYNC_TABLES.map((table) => {
    const rows = Array.isArray(result[table]) ? (result[table] as Row[]) : [];
    const changes: TableChanges = { table, upserts: [], deletes: [] };
    for (const row of rows) {
      const key = rowKey(table, row);
      if (row.deleted_at) changes.deletes.push(key);
      else changes.upserts.push({ key, row });
    }
    return changes;
  }).filter((c) => c.upserts.length || c.deletes.length);
}

export interface OutboxItem {
  id: string;
  table: OutboxTable;
  op: "upsert" | "delete";
  /** The full row for upsert (client-generated UUID in `id`); `{id}` for delete. */
  payload: Row;
  created_at: string;
  attempts: number;
  last_error: string | null;
}

export interface SyncState {
  server_version: number;
  last_success_at: string | null;
  last_attempt_at: string | null;
  last_error: string | null;
}

export interface SyncStore {
  getState(): Promise<SyncState>;
  /** One transaction: apply every change, replace `me`, save the new version and success time. */
  applyPull(
    changes: TableChanges[],
    me: Row | null,
    serverVersion: number,
    at: string,
  ): Promise<void>;
  recordFailure(error: string, at: string): Promise<void>;
  /** Oldest first. */
  listOutbox(): Promise<OutboxItem[]>;
  removeOutbox(id: string): Promise<void>;
  bumpOutbox(id: string, error: string): Promise<void>;
}

/** Outcome of sending one outbox item. */
export type WriteResult = "ok" | "rejected" | "retry";

export interface SyncRemote {
  pull(since: number): Promise<PullResult>;
  write(item: OutboxItem): Promise<WriteResult>;
}

export interface SyncOutcome {
  ok: boolean;
  /** Tables that changed (screens re-query these). */
  changed: string[];
  /** Outbox items dropped because the server refused them (shown as a toast). */
  rejected: OutboxItem[];
  error: string | null;
}

/** An item that failed this many times on the network is kept but no longer blocks the rest. */
export const OUTBOX_MAX_ATTEMPTS = 8;

/**
 * Push the outbox in order, then pull. Network problems keep the outbox and
 * record the failure (the freshness label then says "Offline"); a refused
 * write is dropped and reported.
 */
export async function syncOnce(
  store: SyncStore,
  remote: SyncRemote,
  now: () => Date = () => new Date(),
): Promise<SyncOutcome> {
  const rejected: OutboxItem[] = [];
  try {
    for (const item of await store.listOutbox()) {
      const result = await remote.write(item);
      if (result === "ok") await store.removeOutbox(item.id);
      else if (result === "rejected") {
        await store.removeOutbox(item.id);
        rejected.push(item);
      } else {
        await store.bumpOutbox(item.id, "network");
        // Later items may depend on this one (same row): keep the order.
        if (item.attempts + 1 < OUTBOX_MAX_ATTEMPTS) throw new Error("network");
      }
    }
    const state = await store.getState();
    const result = await remote.pull(state.server_version);
    const changes = splitPull(result);
    await store.applyPull(
      changes,
      result.me ?? null,
      Number(result.server_version),
      now().toISOString(),
    );
    return { ok: true, changed: changes.map((c) => c.table), rejected, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await store.recordFailure(message, now().toISOString());
    return { ok: false, changed: [], rejected, error: message };
  }
}

export type SyncReason = "start" | "foreground" | "network" | "push" | "refresh" | "background";

/** Foreground returns only sync again after this long (docs: 2 minutes). */
export const FOREGROUND_MIN_MS = 2 * 60 * 1000;

/**
 * One sync at a time: a trigger while a sync runs waits for that sync instead
 * of starting another. "foreground" is skipped when the last success is recent.
 */
export function createSyncRunner(
  store: SyncStore,
  remote: SyncRemote,
  onDone?: (outcome: SyncOutcome) => void,
  now: () => Date = () => new Date(),
) {
  let running: Promise<SyncOutcome> | null = null;
  return async function run(reason: SyncReason): Promise<SyncOutcome | null> {
    if (running) return running;
    if (reason === "foreground") {
      const { last_success_at } = await store.getState();
      if (last_success_at && now().getTime() - Date.parse(last_success_at) < FOREGROUND_MIN_MS) {
        return null;
      }
    }
    running = syncOnce(store, remote, now).finally(() => {
      running = null;
    });
    const outcome = await running;
    onDone?.(outcome);
    return outcome;
  };
}

export type Freshness =
  { kind: "never" } | { kind: "updated"; minutes: number } | { kind: "offline"; since: string };

/**
 * SYNC-4 label: "Updated 5 min ago", or "Offline · showing data from 9:12 AM"
 * when the last attempt failed after the last success.
 */
export function freshness(state: SyncState, now: Date = new Date()): Freshness {
  if (!state.last_success_at) return { kind: "never" };
  const failedLater =
    state.last_error !== null &&
    state.last_attempt_at !== null &&
    state.last_attempt_at > state.last_success_at;
  if (failedLater) return { kind: "offline", since: state.last_success_at };
  return {
    kind: "updated",
    minutes: Math.max(0, Math.floor((now.getTime() - Date.parse(state.last_success_at)) / 60000)),
  };
}
