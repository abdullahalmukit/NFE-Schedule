import { View } from "react-native";
import { Text } from "./text";
import { useTheme } from "./ui-provider";

export interface FreeTimeBlockProps {
  label: string;
  /** "09:50 – 02:40" */
  range: string;
  /** "4 h 50 min" */
  duration: string;
}

export function FreeTimeBlock({ label, range, duration }: FreeTimeBlockProps) {
  const t = useTheme();
  return (
    <View
      style={{
        marginLeft: 68,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: t.color.border,
        borderRadius: t.radius.card,
        paddingHorizontal: 16,
        paddingVertical: 12,
      }}
    >
      <View>
        <Text variant="bodyStrong">{label}</Text>
        <Text variant="small" color="textMuted">
          {range}
        </Text>
      </View>
      <View
        style={{
          backgroundColor: t.color.surfaceRaised,
          borderRadius: 8,
          paddingHorizontal: 10,
          paddingVertical: 4,
        }}
      >
        <Text variant="smallStrong">{duration}</Text>
      </View>
    </View>
  );
}
