import { View } from "react-native";
import { Text } from "./text";
import { useTheme } from "./ui-provider";

export interface WeekScheduleItem {
  time: string;
  /** "263-A1" */
  label: string;
  /** The student's own class. */
  highlight?: boolean;
}

export interface WeekScheduleRowProps {
  day: string;
  items: WeekScheduleItem[];
  last?: boolean;
}

/** Teacher screen: day label + time / section pills. */
export function WeekScheduleRow({ day, items, last }: WeekScheduleRowProps) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 12,
        paddingVertical: 12,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: t.color.border,
      }}
    >
      <Text variant="smallStrong" color="textMuted" style={{ width: 40, paddingTop: 6 }}>
        {day}
      </Text>
      <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {items.map((it) => (
          <View
            key={`${it.time}-${it.label}`}
            style={{
              flexDirection: "row",
              gap: 8,
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 6,
              backgroundColor: it.highlight ? t.color.accentSoft : t.color.surfaceRaised,
            }}
          >
            <Text variant="small" color={it.highlight ? "accent" : "textMuted"}>
              {it.time}
            </Text>
            <Text variant="smallStrong" color={it.highlight ? "accent" : "text"}>
              {it.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
