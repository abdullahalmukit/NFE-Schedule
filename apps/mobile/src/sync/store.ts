/** `SyncStore` on expo-sqlite (see `@nfe/core` sync engine). */
import type { OutboxItem, OutboxTable, Row, SyncState, SyncStore } from "@nfe/core";
import { db } from "./db";

interface OutboxRow {
  id: string;
  tbl: string;
  op: "upsert" | "delete";
  payload: string;
  created_at: string;
  attempts: number;
  last_error: string | null;
}

export const sqliteStore: SyncStore = {
  async getState(): Promise<SyncState> {
    const s = await (
      await db()
    ).getFirstAsync<SyncState>(
      "select server_version, last_success_at, last_attempt_at, last_error from sync_state where id = 1",
    );
    return (
      s ?? { server_version: 0, last_success_at: null, last_attempt_at: null, last_error: null }
    );
  },

  async applyPull(changes, me, serverVersion, at) {
    const d = await db();
    await d.withTransactionAsync(async () => {
      for (const c of changes) {
        for (const u of c.upserts) {
          await d.runAsync("insert or replace into rows (tbl, key, data) values (?, ?, ?)", [
            c.table,
            u.key,
            JSON.stringify(u.row),
          ]);
        }
        for (const key of c.deletes) {
          await d.runAsync("delete from rows where tbl = ? and key = ?", [c.table, key]);
        }
      }
      if (me) {
        await d.runAsync("insert or replace into kv (key, value) values ('me', ?)", [
          JSON.stringify(me),
        ]);
      } else {
        await d.runAsync("delete from kv where key = 'me'");
      }
      await d.runAsync(
        "update sync_state set server_version = ?, last_success_at = ?, last_attempt_at = ?, last_error = null where id = 1",
        [serverVersion, at, at],
      );
    });
  },

  async recordFailure(error, at) {
    await (
      await db()
    ).runAsync("update sync_state set last_attempt_at = ?, last_error = ? where id = 1", [
      at,
      error,
    ]);
  },

  async listOutbox(): Promise<OutboxItem[]> {
    const rows = await (
      await db()
    ).getAllAsync<OutboxRow>("select * from outbox order by created_at, rowid");
    return rows.map((r) => ({
      id: r.id,
      table: r.tbl as OutboxTable,
      op: r.op,
      payload: JSON.parse(r.payload) as Row,
      created_at: r.created_at,
      attempts: r.attempts,
      last_error: r.last_error,
    }));
  },

  async removeOutbox(id) {
    await (await db()).runAsync("delete from outbox where id = ?", [id]);
  },

  async bumpOutbox(id, error) {
    await (
      await db()
    ).runAsync("update outbox set attempts = attempts + 1, last_error = ? where id = ?", [
      error,
      id,
    ]);
  },
};
