/**
 * Background sync every `app_settings.sync.background_minutes` (SYNC-2,
 * Android best effort). The task is defined at module load, as TaskManager
 * requires; import this file from the root layout.
 */
import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { readSetting } from "@nfe/core";
import { loadTable } from "./db";
import { runSync } from "./runner";

const TASK = "nfe-background-sync";

TaskManager.defineTask(TASK, async () => {
  const outcome = await runSync("background");
  return outcome?.ok === false
    ? BackgroundTask.BackgroundTaskResult.Failed
    : BackgroundTask.BackgroundTaskResult.Success;
});

/** (Re)register with the interval from the synced settings. */
export async function registerBackgroundSync(): Promise<void> {
  try {
    const settings = await loadTable<{ key: string; value: unknown }>("app_settings");
    const minutes = readSetting(
      "sync",
      settings.find((s) => s.key === "sync")?.value,
    ).background_minutes;
    const status = await BackgroundTask.getStatusAsync();
    if (status !== BackgroundTask.BackgroundTaskStatus.Available) return;
    if (await TaskManager.isTaskRegisteredAsync(TASK))
      await BackgroundTask.unregisterTaskAsync(TASK);
    await BackgroundTask.registerTaskAsync(TASK, { minimumInterval: minutes });
  } catch {
    // Background work is a bonus; foreground triggers still keep the data fresh.
  }
}
