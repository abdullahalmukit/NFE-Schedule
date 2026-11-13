import { Pressable } from "react-native";
import { Icon } from "./icon";
import { Text } from "./text";
import { useTheme } from "./ui-provider";

export interface SelectButtonProps {
  /** Current value, e.g. "08:20 – 09:50". */
  value: string;
  label: string;
  onPress?: () => void;
}

/** Dropdown trigger (Empty rooms slot picker); the list opens in a sheet. */
export function SelectButton({ value, label, onPress }: SelectButtonProps) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={value}
      onPress={onPress}
      style={({ pressed }) => ({
        height: 56,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: t.color.border,
        backgroundColor: pressed ? t.color.surfaceRaised : t.color.surface,
      })}
    >
      <Text variant="bodyStrong">{value}</Text>
      <Icon name="chevronDown" size={20} color={t.color.textMuted} />
    </Pressable>
  );
}
