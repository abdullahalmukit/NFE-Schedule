/**
 * Key-value storage that splits long values into chunks, for stores with a
 * size limit per value (expo-secure-store warns above 2048 bytes; a Supabase
 * session is larger). Layout: "<key>.n" = number of chunks, "<key>.<i>" = chunk i.
 */
export interface AsyncKeyValueStore {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const DEFAULT_CHUNK_SIZE = 1800;

export function splitIntoChunks(value: string, size: number = DEFAULT_CHUNK_SIZE): string[] {
  if (size < 1) throw new Error("chunk size must be positive");
  const parts: string[] = [];
  for (let i = 0; i < value.length; i += size) parts.push(value.slice(i, i + size));
  return parts.length ? parts : [""];
}

export function chunkedStorage(
  store: AsyncKeyValueStore,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
): StorageAdapter {
  async function count(key: string): Promise<number> {
    const n = Number.parseInt((await store.getItemAsync(`${key}.n`)) ?? "", 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }

  async function removeItem(key: string): Promise<void> {
    const n = await count(key);
    await Promise.all(Array.from({ length: n }, (_, i) => store.deleteItemAsync(`${key}.${i}`)));
    await store.deleteItemAsync(`${key}.n`);
  }

  return {
    async getItem(key) {
      const n = await count(key);
      if (n === 0) return null;
      const parts = await Promise.all(
        Array.from({ length: n }, (_, i) => store.getItemAsync(`${key}.${i}`)),
      );
      // A missing chunk means a half-written value: treat it as absent.
      return parts.every((p) => p !== null) ? parts.join("") : null;
    },
    async setItem(key, value) {
      await removeItem(key);
      const parts = splitIntoChunks(value, chunkSize);
      await Promise.all(parts.map((p, i) => store.setItemAsync(`${key}.${i}`, p)));
      await store.setItemAsync(`${key}.n`, String(parts.length));
    },
    removeItem,
  };
}
