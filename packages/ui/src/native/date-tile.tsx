import { View } from "react-native";
import { Text } from "./text";
import { useTheme } from "./ui-provider";

export interface DateTileProps {
  /** "MON" */
  month: string;
  /** "16" */
  day: string;
}

export function DateTile({ month, day }: DateTileProps) {
  const t = useTheme();
  return (
    <View
      style={{
        width: 56,
        height: 64,
        borderRadius: 12,
        backgroundColor: t.color.surfaceRaised,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text variant="caption" color="textMuted">
        {month}
      </Text>
      <Text variant="title" style={{ lineHeight: 26 }}>
        {day}
      </Text>
    </View>
  );
}
