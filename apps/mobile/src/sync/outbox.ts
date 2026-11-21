/**
 * Offline writes for personal data (SYNC-3): the row is saved locally at once
 * (screens see it immediately) and queued for upload; the next sync sends the
 * queue in order before pulling.
 */
import { OUTBOX_TABLES, rowKey, type OutboxTable, type Row } from "@nfe/core";
import { db } from "./db";
import { emitChange } from "./events";

/** A client-generated id, so a retried upload upserts the same row. */
export function newId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    })
  );
}

export async function queueWrite(
  table: OutboxTable,
  op: "upsert" | "delete",
  row: Row,
): Promise<void> {
  if (!(OUTBOX_TABLES as readonly string[]).includes(table)) {
    throw new Error(`${table} cannot be changed offline`);
  }
  const now = new Date().toISOString();
  const payload = op === "upsert" ? { ...row, updated_at: now } : { id: row.id };
  const d = await db();
  await d.withTransactionAsync(async () => {
    await d.runAsync(
      "insert into outbox (id, tbl, op, payload, created_at) values (?, ?, ?, ?, ?)",
      [newId(), table, op, JSON.stringify(payload), now],
    );
    if (op === "upsert") {
      await d.runAsync("insert or replace into rows (tbl, key, data) values (?, ?, ?)", [
        table,
        rowKey(table, payload),
        JSON.stringify(payload),
      ]);
    } else {
      await d.runAsync("delete from rows where tbl = ? and key = ?", [table, String(row.id)]);
    }
  });
  emitChange([table]);
}
