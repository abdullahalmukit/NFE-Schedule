import { Pressable, View } from "react-native";
import { Text } from "./text";
import { useTheme } from "./ui-provider";

export interface NextClassCardProps {
  /** "NEXT CLASS · TOMORROW" */
  caption: string;
  title: string;
  /** "0531-1103 · Theory" */
  subtitle: string;
  /** "08:20 – 09:50" */
  time: string;
  initial: string;
  room: string;
  onPress?: () => void;
}

export function NextClassCard({
  caption,
  title,
  subtitle,
  time,
  initial,
  room,
  onPress,
}: NextClassCardProps) {
  const t = useTheme();
  const fg = t.color.onAccent;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: t.color.accent,
        borderRadius: t.radius.card,
        padding: 20,
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <Text variant="caption" rawColor={fg} style={{ opacity: 0.8 }}>
        {caption}
      </Text>
      <Text variant="title" rawColor={fg} style={{ marginTop: 8 }}>
        {title}
      </Text>
      <Text variant="small" rawColor={fg} style={{ opacity: 0.8 }}>
        {subtitle}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 24, marginTop: 16 }}>
        {[time, initial, room].map((v) => (
          <Text key={v} variant="bodyBold" rawColor={fg}>
            {v}
          </Text>
        ))}
      </View>
    </Pressable>
  );
}
