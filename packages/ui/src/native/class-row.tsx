import { Pressable, View } from "react-native";
import { courseTone } from "../theme";
import { Text } from "./text";
import { useTheme } from "./ui-provider";

export interface ClassRowProps {
  /** "08:20" */
  time: string;
  title: string;
  /** "0531-1103 · DNU · AB-1: 304" */
  meta: string;
  /** Course colour index (hash of the course code). */
  colorIndex: number;
  onPress?: () => void;
}

/** Home list row: coloured time tile + title + meta. */
export function ClassRow({ time, title, meta, colorIndex, onPress }: ClassRowProps) {
  const t = useTheme();
  const c = courseTone(t.name, colorIndex);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        paddingVertical: 12,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View
        style={{
          width: 56,
          height: 48,
          borderRadius: 12,
          backgroundColor: c.tint,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text variant="smallStrong" rawColor={c.onTint}>
          {time}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="small" color="textMuted" numberOfLines={1}>
          {meta}
        </Text>
      </View>
    </Pressable>
  );
}
