import { Pressable, View } from "react-native";
import { Text } from "./text";
import { useTheme } from "./ui-provider";

export interface DateStripDay {
  key: string;
  /** "7" */
  day: string;
  /** "SAT" */
  weekday: string;
  /** Full date for screen readers, e.g. "Saturday, 7 November". */
  label: string;
}

export interface DateStripProps {
  days: DateStripDay[];
  selected: string;
  onSelect: (key: string) => void;
}

export function DateStrip({ days, selected, onSelect }: DateStripProps) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 2,
        backgroundColor: t.color.surface,
        borderRadius: t.radius.card,
        padding: 6,
      }}
    >
      {days.map((d) => {
        const active = d.key === selected;
        return (
          <Pressable
            key={d.key}
            accessibilityRole="button"
            accessibilityLabel={d.label}
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(d.key)}
            style={{
              flex: 1,
              height: 56,
              borderRadius: 12,
              backgroundColor: active ? t.color.accent : "transparent",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              variant="title"
              color={active ? "onAccent" : "text"}
              style={{ fontSize: 20, lineHeight: 24 }}
            >
              {d.day}
            </Text>
            <Text
              variant="caption"
              color={active ? "onAccent" : "textMuted"}
              style={{ letterSpacing: 0 }}
            >
              {d.weekday}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
