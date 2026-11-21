/**
 * Screens read only local data (SYNC-1): `useTables(["class_slots", ...])`
 * loads those tables and loads them again whenever a sync or an offline write
 * changes one of them.
 */
import { useEffect, useState } from "react";
import { loadTable } from "./db";
import { onChange } from "./events";

export type Tables<K extends string> = Record<K, Record<string, unknown>[]>;

export function useTables<K extends string>(names: readonly K[]): Tables<K> | null {
  const [data, setData] = useState<Tables<K> | null>(null);
  const key = names.join(",");
  useEffect(() => {
    let alive = true;
    const list = key.split(",") as K[];
    const load = async () => {
      const entries = await Promise.all(list.map(async (n) => [n, await loadTable(n)] as const));
      if (alive) setData(Object.fromEntries(entries) as Tables<K>);
    };
    void load();
    const off = onChange((changed) => {
      if (changed.some((t) => list.includes(t as K))) void load();
    });
    return () => {
      alive = false;
      off();
    };
  }, [key]);
  return data;
}
