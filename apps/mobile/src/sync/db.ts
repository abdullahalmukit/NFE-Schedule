/**
 * Local database (SYNC-1). Every synced row is kept as JSON in one `rows`
 * table keyed by (server table, row key); screens load the rows they need and
 * compute with the shared `@nfe/core` functions. No local migrations are
 * needed when the server adds a column. Local-only tables: `sync_state`,
 * `outbox`, `kv` (docs/SYNC_AND_OFFLINE.md §3).
 */
import * as SQLite from "expo-sqlite";

/** Bump when the local layout changes; the app then clears the data and downloads everything again. */
export const LOCAL_SCHEMA_VERSION = 1;

let opening: Promise<SQLite.SQLiteDatabase> | null = null;

export function db(): Promise<SQLite.SQLiteDatabase> {
  opening ??= open();
  return opening;
}

async function open(): Promise<SQLite.SQLiteDatabase> {
  const d = await SQLite.openDatabaseAsync("nfe.db");
  await d.execAsync(`
    pragma journal_mode = wal;
    create table if not exists rows (
      tbl  text not null,
      key  text not null,
      data text not null,
      primary key (tbl, key)
    );
    create table if not exists sync_state (
      id integer primary key check (id = 1),
      server_version integer not null default 0,
      last_success_at text,
      last_attempt_at text,
      last_error text
    );
    insert or ignore into sync_state (id) values (1);
    create table if not exists outbox (
      id text primary key,
      tbl text not null,
      op text not null check (op in ('upsert', 'delete')),
      payload text not null,
      created_at text not null,
      attempts integer not null default 0,
      last_error text
    );
    create table if not exists kv (key text primary key, value text not null);
  `);
  const row = await d.getFirstAsync<{ value: string }>(
    "select value from kv where key = 'local_schema_version'",
  );
  if (Number(row?.value ?? 0) !== LOCAL_SCHEMA_VERSION) {
    await resetData(d);
    await d.runAsync("insert or replace into kv (key, value) values ('local_schema_version', ?)", [
      String(LOCAL_SCHEMA_VERSION),
    ]);
  }
  return d;
}

/** Forget synced rows so the next sync downloads everything (Settings → "Re-download data"). */
export async function resetData(d?: SQLite.SQLiteDatabase): Promise<void> {
  const conn = d ?? (await db());
  await conn.withTransactionAsync(async () => {
    await conn.runAsync("delete from rows");
    await conn.runAsync(
      "update sync_state set server_version = 0, last_success_at = null, last_attempt_at = null, last_error = null",
    );
    await conn.runAsync("delete from kv where key = 'me'");
  });
}

export async function kvGet(key: string): Promise<string | null> {
  const row = await (
    await db()
  ).getFirstAsync<{ value: string }>("select value from kv where key = ?", [key]);
  return row?.value ?? null;
}

export async function kvSet(key: string, value: string): Promise<void> {
  await (await db()).runAsync("insert or replace into kv (key, value) values (?, ?)", [key, value]);
}

/** Every live row of a synced table, parsed. */
export async function loadTable<T = Record<string, unknown>>(table: string): Promise<T[]> {
  const rows = await (
    await db()
  ).getAllAsync<{ data: string }>("select data from rows where tbl = ?", [table]);
  return rows.map((r) => JSON.parse(r.data) as T);
}
