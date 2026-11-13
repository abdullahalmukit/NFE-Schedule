import type { ReactNode } from "react";
import { View } from "react-native";
import { Card } from "./card";
import { Text } from "./text";

export interface SettingsGroupProps {
  /** Caption above the group, e.g. "MY SCHEDULE". */
  title?: string;
  children: ReactNode;
}

/** Grouped list of SettingsRow (mark the final row `last`). */
export function SettingsGroup({ title, children }: SettingsGroupProps) {
  return (
    <View>
      {title ? (
        <Text variant="caption" color="textMuted" header style={{ marginBottom: 8 }}>
          {title}
        </Text>
      ) : null}
      <Card padding="none">{children}</Card>
    </View>
  );
}
