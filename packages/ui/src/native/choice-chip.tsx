import { Pressable } from "react-native";
import { Text } from "./text";
import { useTheme } from "./ui-provider";

export interface ChoiceChipProps {
  label: string;
  selected?: boolean;
  /** Lab groups use wide chips that share the row. */
  wide?: boolean;
  /** Day chips on Empty rooms are fully rounded. */
  shape?: "chip" | "pill";
  onPress?: () => void;
}

export function ChoiceChip({ label, selected, wide, shape = "chip", onPress }: ChoiceChipProps) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: wide ? 1 : undefined,
        minWidth: 48,
        height: 48,
        paddingHorizontal: 12,
        borderRadius: shape === "pill" ? 999 : t.radius.chip,
        backgroundColor: selected
          ? t.color.accent
          : pressed
            ? t.color.surfaceRaised
            : t.color.surface,
        borderWidth: selected ? 0 : 1,
        borderColor: t.color.border,
        alignItems: "center",
        justifyContent: "center",
      })}
    >
      <Text variant="bodyStrong" color={selected ? "onAccent" : "text"}>
        {label}
      </Text>
    </Pressable>
  );
}
