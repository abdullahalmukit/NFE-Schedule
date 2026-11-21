/**
 * Sync triggers and state for the app (SYNC-2, SYNC-4): app start, return to
 * the foreground, network regained, pull-to-refresh (`refresh`), push (call
 * `runSync("push")` from the notification handler), background task.
 */
import NetInfo from "@react-native-community/netinfo";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import { freshness, type Freshness, type SyncOutcome } from "@nfe/core";
import { useAuth } from "../auth/auth-provider";
import { registerBackgroundSync } from "./background";
import { onChange } from "./events";
import { onSyncDone, resyncIfSchemaChanged, runSync } from "./runner";
import { sqliteStore } from "./store";

interface SyncContextValue {
  freshness: Freshness;
  online: boolean;
  syncing: boolean;
  /** Pull-to-refresh. */
  refresh: () => Promise<SyncOutcome | null>;
  /** Writes the server refused in the last sync (shown once as a toast). */
  rejected: number;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const { stage } = useAuth();
  const [fresh, setFresh] = useState<Freshness>({ kind: "never" });
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [rejected, setRejected] = useState(0);

  const updateFreshness = useCallback(async () => {
    setFresh(freshness(await sqliteStore.getState()));
  }, []);

  const run = useCallback(
    async (reason: Parameters<typeof runSync>[0]) => {
      setSyncing(true);
      try {
        const outcome = await runSync(reason);
        if (outcome?.ok) await resyncIfSchemaChanged();
        return outcome;
      } finally {
        setSyncing(false);
        void updateFreshness();
      }
    },
    [updateFreshness],
  );

  // A new session (sign-in, sign-out, guest) can see different rows: sync again.
  useEffect(() => {
    void updateFreshness();
    void run("start").then(() => registerBackgroundSync());
  }, [stage, run, updateFreshness]);

  useEffect(() => {
    const app = AppState.addEventListener("change", (s) => {
      if (s === "active") void run("foreground");
    });
    let wasOnline = true;
    const net = NetInfo.addEventListener((state) => {
      const now = state.isConnected !== false && state.isInternetReachable !== false;
      setOnline(now);
      if (now && !wasOnline) void run("network");
      wasOnline = now;
    });
    const done = onSyncDone((o) => setRejected(o.rejected.length));
    const changed = onChange(() => void updateFreshness());
    // The "5 min ago" label moves on by itself.
    const tick = setInterval(() => void updateFreshness(), 60_000);
    return () => {
      app.remove();
      net();
      done();
      changed();
      clearInterval(tick);
    };
  }, [run, updateFreshness]);

  const value = useMemo<SyncContextValue>(
    () => ({ freshness: fresh, online, syncing, refresh: () => run("refresh"), rejected }),
    [fresh, online, syncing, run, rejected],
  );
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncContextValue {
  const v = useContext(SyncContext);
  if (!v) throw new Error("useSync outside SyncProvider");
  return v;
}
