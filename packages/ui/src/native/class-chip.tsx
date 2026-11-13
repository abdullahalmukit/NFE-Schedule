import { Pressable } from "react-native";
import type { IconName } from "../icon-names";
import { Icon } from "./icon";
import { Text } from "./text";

export interface ClassChipProps {
  icon: IconName;
  label: string;
  accessibilityLabel?: string;
  color: string;
  onPress?: () => void;
}

/** Teacher / room chip inside a class card (tappable, RT-11). */
export function ClassChip({ icon, label, accessibilityLabel, color, onPress }: ClassChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        height: 36,
        paddingHorizontal: 12,
        borderRadius: 999,
        backgroundColor: "rgba(0,0,0,0.2)",
      }}
    >
      <Icon name={icon} color={color} size={14} />
      <Text variant="smallStrong" rawColor={color}>
        {label}
      </Text>
    </Pressable>
  );
}
