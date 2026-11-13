import { Pressable, View } from "react-native";
import { courseTone } from "../theme";
import { ClassChip } from "./class-chip";
import { Text } from "./text";
import { useTheme } from "./ui-provider";

export interface ClassCardProps {
  start: string;
  end: string;
  title: string;
  /** "0531-1104 · Lab" */
  meta: string;
  teacher: string;
  room: string;
  /** Lab group badge, e.g. "A1". */
  badge?: string;
  colorIndex: number;
  /** Exception text shown on the card, e.g. "Cancelled". */
  status?: string;
  cancelled?: boolean;
  teacherLabel?: string;
  roomLabel?: string;
  onPress?: () => void;
  onTeacher?: () => void;
  onRoom?: () => void;
}

/** Routine daily card with the time rail on the left. */
export function ClassCard(p: ClassCardProps) {
  const t = useTheme();
  const c = courseTone(t.name, p.colorIndex);
  return (
    <View style={{ flexDirection: "row", gap: 12 }}>
      <View style={{ width: 56, justifyContent: "space-between", paddingVertical: 4 }}>
        <Text variant="smallStrong" color="textMuted">
          {p.start}
        </Text>
        <Text variant="smallStrong" color="textMuted">
          {p.end}
        </Text>
      </View>
      <View style={{ flex: 1, backgroundColor: c.fill, borderRadius: t.radius.card, padding: 16 }}>
        <Pressable accessibilityRole="button" onPress={p.onPress} style={{ paddingRight: 40 }}>
          <Text
            variant="title"
            rawColor={c.onFill}
            strikeThrough={p.cancelled}
            style={{ fontSize: 20, lineHeight: 26 }}
          >
            {p.title}
          </Text>
          <Text variant="small" rawColor={c.onFill} style={{ opacity: 0.8 }}>
            {p.meta}
          </Text>
        </Pressable>
        {p.badge ? (
          <View
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              backgroundColor: t.color.text,
              borderRadius: 6,
              paddingHorizontal: 8,
              paddingVertical: 2,
            }}
          >
            <Text variant="smallStrong" color="bg" style={{ fontSize: 12, lineHeight: 16 }}>
              {p.badge}
            </Text>
          </View>
        ) : null}
        {p.status ? (
          <Text variant="smallStrong" rawColor={c.onFill} style={{ marginTop: 8 }}>
            {p.status}
          </Text>
        ) : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          <ClassChip
            icon="user"
            label={p.teacher}
            accessibilityLabel={p.teacherLabel}
            color={c.onFill}
            onPress={p.onTeacher}
          />
          <ClassChip
            icon="pin"
            label={p.room}
            accessibilityLabel={p.roomLabel}
            color={c.onFill}
            onPress={p.onRoom}
          />
        </View>
      </View>
    </View>
  );
}
