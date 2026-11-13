import { Pressable, View } from "react-native";
import { Text } from "./text";
import { useTheme } from "./ui-provider";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Daily / Weekly switch. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const t = useTheme();
  return (
    <View
      accessibilityRole="radiogroup"
      style={{
        flexDirection: "row",
        gap: 4,
        backgroundColor: t.color.surface,
        borderRadius: 16,
        padding: 4,
      }}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            onPress={() => onChange(o.value)}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 12,
              backgroundColor: active ? t.color.accent : "transparent",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text variant="bodyStrong" color={active ? "onAccent" : "textMuted"}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
