/** SYNC-4: "Updated 5 min ago" / "Offline · showing data from 09:12" for Home and Routine. */
import { fill, formatTime, localDigits, t } from "@nfe/core";
import { Text, useUi } from "@nfe/ui/native";
import { useSync } from "./sync-provider";

export function FreshnessLabel() {
  const { freshness } = useSync();
  const { locale } = useUi();
  if (freshness.kind === "never") {
    return (
      <Text variant="caption" color="textMuted">
        {t(locale, "sync.never")}
      </Text>
    );
  }
  if (freshness.kind === "offline") {
    const at = new Date(freshness.since);
    const time = `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;
    return (
      <Text variant="caption" color="warning">
        {fill(t(locale, "sync.offline"), { time: formatTime(time, "file", locale) })}
      </Text>
    );
  }
  return (
    <Text variant="caption" color="textMuted">
      {freshness.minutes < 1
        ? t(locale, "sync.justNow")
        : fill(t(locale, "sync.updated"), { n: localDigits(freshness.minutes, locale) })}
    </Text>
  );
}
