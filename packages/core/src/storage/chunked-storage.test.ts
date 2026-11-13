import { describe, expect, it } from "vitest";
import { chunkedStorage, splitIntoChunks, type AsyncKeyValueStore } from "./chunked-storage";

function memoryStore(): AsyncKeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItemAsync: async (k) => data.get(k) ?? null,
    setItemAsync: async (k, v) => void data.set(k, v),
    deleteItemAsync: async (k) => void data.delete(k),
  };
}

describe("splitIntoChunks", () => {
  it("splits and keeps every character", () => {
    expect(splitIntoChunks("abcdefg", 3)).toEqual(["abc", "def", "g"]);
    expect(splitIntoChunks("", 3)).toEqual([""]);
  });
});

describe("chunkedStorage", () => {
  it("round-trips a long value through small chunks", async () => {
    const store = memoryStore();
    const s = chunkedStorage(store, 10);
    const value = "x".repeat(95) + "end";
    await s.setItem("sb-auth", value);
    expect(store.data.get("sb-auth.n")).toBe("10");
    expect(await s.getItem("sb-auth")).toBe(value);
  });

  it("removes old chunks when a shorter value is written", async () => {
    const store = memoryStore();
    const s = chunkedStorage(store, 10);
    await s.setItem("k", "y".repeat(50));
    await s.setItem("k", "short");
    expect(await s.getItem("k")).toBe("short");
    expect([...store.data.keys()].sort()).toEqual(["k.0", "k.n"]);
  });

  it("returns null when absent, removed or half written", async () => {
    const store = memoryStore();
    const s = chunkedStorage(store, 4);
    expect(await s.getItem("k")).toBeNull();
    await s.setItem("k", "abcdefgh");
    store.data.delete("k.1");
    expect(await s.getItem("k")).toBeNull();
    await s.removeItem("k");
    expect(store.data.size).toBe(0);
  });
});
