import { describe, expect, it } from "vitest";
import {
  createSyncRunner,
  freshness,
  rowKey,
  splitPull,
  syncOnce,
  type OutboxItem,
  type PullResult,
  type Row,
  type SyncRemote,
  type SyncState,
  type SyncStore,
  type TableChanges,
  type WriteResult,
} from "../src/sync/engine";

/** In-memory stand-in for the phone's SQLite store. */
function memoryStore(outbox: OutboxItem[] = []) {
  const tables = new Map<string, Map<string, Row>>();
  let me: Row | null = null;
  const state: SyncState = {
    server_version: 0,
    last_success_at: null,
    last_attempt_at: null,
    last_error: null,
  };
  const store: SyncStore & {
    tables: typeof tables;
    outbox: OutboxItem[];
    me: () => Row | null;
    state: SyncState;
  } = {
    tables,
    outbox,
    state,
    me: () => me,
    async getState() {
      return { ...state };
    },
    async applyPull(changes: TableChanges[], newMe, version, at) {
      for (const c of changes) {
        const t = tables.get(c.table) ?? new Map<string, Row>();
        for (const u of c.upserts) t.set(u.key, u.row);
        for (const d of c.deletes) t.delete(d);
        tables.set(c.table, t);
      }
      me = newMe;
      Object.assign(state, {
        server_version: version,
        last_success_at: at,
        last_attempt_at: at,
        last_error: null,
      });
    },
    async recordFailure(error, at) {
      Object.assign(state, { last_error: error, last_attempt_at: at });
    },
    async listOutbox() {
      return [...outbox];
    },
    async removeOutbox(id) {
      outbox.splice(
        outbox.findIndex((o) => o.id === id),
        1,
      );
    },
    async bumpOutbox(id, error) {
      const item = outbox.find((o) => o.id === id)!;
      item.attempts += 1;
      item.last_error = error;
    },
  };
  return store;
}

const item = (id: string, attempts = 0): OutboxItem => ({
  id,
  table: "notes",
  op: "upsert",
  payload: { id, body: id },
  created_at: `2026-11-21T10:0${id}:00Z`,
  attempts,
  last_error: null,
});

describe("sync pull", () => {
  it("keys rows per table and splits tombstones", () => {
    expect(rowKey("app_settings", { key: "week" })).toBe("week");
    expect(rowKey("i18n_overrides", { locale: "bn", key: "app.name" })).toBe("bn|app.name");
    expect(rowKey("class_slots", { id: "c1" })).toBe("c1");
    const changes = splitPull({
      server_version: 9,
      me: null,
      class_slots: [{ id: "c1" }, { id: "c2", deleted_at: "2026-11-20" }],
      courses: [],
      unknown_table: [{ id: "x" }],
    });
    expect(changes).toEqual([
      { table: "class_slots", upserts: [{ key: "c1", row: { id: "c1" } }], deletes: ["c2"] },
    ]);
  });

  it("pushes the outbox in order, then pulls from the stored version", async () => {
    const store = memoryStore([item("1"), item("2")]);
    const calls: string[] = [];
    const remote: SyncRemote = {
      async write(i) {
        calls.push(`write ${i.id}`);
        return "ok";
      },
      async pull(since) {
        calls.push(`pull ${since}`);
        return { server_version: 42, me: { id: "u1" }, courses: [{ id: "k1", code: "0531-1103" }] };
      },
    };
    const out = await syncOnce(store, remote, () => new Date("2026-11-21T10:10:00Z"));
    expect(calls).toEqual(["write 1", "write 2", "pull 0"]);
    expect(out).toMatchObject({ ok: true, changed: ["courses"], rejected: [] });
    expect(store.outbox).toEqual([]);
    expect(store.state).toMatchObject({
      server_version: 42,
      last_success_at: "2026-11-21T10:10:00.000Z",
    });
    expect(store.me()).toEqual({ id: "u1" });

    await syncOnce(store, {
      ...remote,
      pull: async (since) => ({ server_version: 43, me: null, since }) as unknown as PullResult,
    });
    expect(store.state.server_version).toBe(43);
  });

  it("keeps the outbox and records the failure when offline", async () => {
    const store = memoryStore([item("1"), item("2")]);
    const writes: string[] = [];
    const remote: SyncRemote = {
      async write(i) {
        writes.push(i.id);
        return "retry" as WriteResult;
      },
      async pull() {
        throw new Error("should not pull");
      },
    };
    const out = await syncOnce(store, remote, () => new Date("2026-11-21T10:10:00Z"));
    expect(out).toMatchObject({ ok: false, error: "network" });
    expect(writes).toEqual(["1"]); // order kept: item 2 waits for item 1
    expect(store.outbox.map((o) => [o.id, o.attempts])).toEqual([
      ["1", 1],
      ["2", 0],
    ]);
    expect(store.state.last_error).toBe("network");
  });

  it("drops a write the server refuses and reports it", async () => {
    const store = memoryStore([item("1")]);
    const out = await syncOnce(store, {
      write: async () => "rejected",
      pull: async () => ({ server_version: 1, me: null }),
    });
    expect(out.ok).toBe(true);
    expect(out.rejected.map((r) => r.id)).toEqual(["1"]);
    expect(store.outbox).toEqual([]);
  });

  it("does not let a stuck item block later ones forever", async () => {
    const store = memoryStore([item("1", 7), item("2")]);
    const out = await syncOnce(store, {
      write: async (i) => (i.id === "1" ? "retry" : "ok"),
      pull: async () => ({ server_version: 1, me: null }),
    });
    expect(out.ok).toBe(true);
    expect(store.outbox.map((o) => o.id)).toEqual(["1"]);
  });
});

describe("sync runner", () => {
  it("runs one sync at a time and skips a recent foreground return", async () => {
    const store = memoryStore();
    let pulls = 0;
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => (release = r));
    const remote: SyncRemote = {
      write: async () => "ok",
      pull: async () => {
        pulls += 1;
        await gate;
        return { server_version: pulls, me: null };
      },
    };
    let clock = new Date("2026-11-21T10:00:00Z");
    const run = createSyncRunner(store, remote, undefined, () => clock);
    const a = run("start");
    const b = run("refresh");
    release();
    await Promise.all([a, b]);
    expect(pulls).toBe(1);
    clock = new Date("2026-11-21T10:01:00Z");
    expect(await run("foreground")).toBeNull();
    clock = new Date("2026-11-21T10:03:00Z");
    expect(await run("foreground")).toMatchObject({ ok: true });
    expect(pulls).toBe(2);
  });
});

describe("freshness (SYNC-4)", () => {
  const now = new Date("2026-11-21T10:10:00Z");
  it("says never, updated N minutes ago, or offline since", () => {
    expect(
      freshness(
        { server_version: 0, last_success_at: null, last_attempt_at: null, last_error: null },
        now,
      ),
    ).toEqual({ kind: "never" });
    expect(
      freshness(
        {
          server_version: 5,
          last_success_at: "2026-11-21T10:05:00Z",
          last_attempt_at: "2026-11-21T10:05:00Z",
          last_error: null,
        },
        now,
      ),
    ).toEqual({ kind: "updated", minutes: 5 });
    expect(
      freshness(
        {
          server_version: 5,
          last_success_at: "2026-11-21T09:12:00Z",
          last_attempt_at: "2026-11-21T10:09:00Z",
          last_error: "network",
        },
        now,
      ),
    ).toEqual({ kind: "offline", since: "2026-11-21T09:12:00Z" });
  });
});
