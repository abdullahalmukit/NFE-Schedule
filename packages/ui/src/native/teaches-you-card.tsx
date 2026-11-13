import { View } from "react-native";
import { Text } from "./text";
import { useTheme } from "./ui-provider";

export interface TeachesYouCardProps {
  /** "TEACHES YOU" */
  caption: string;
  /** "0531-1104 · Lab group A1" */
  title: string;
  /** "Wednesday 08:20 – 09:50 · AB-1: 206" */
  detail: string;
}

export function TeachesYouCard({ caption, title, detail }: TeachesYouCardProps) {
  const t = useTheme();
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: t.color.accent,
        backgroundColor: t.color.surface,
        borderRadius: t.radius.card,
        padding: 16,
      }}
    >
      <Text variant="caption" color="accent">
        {caption}
      </Text>
      <Text variant="bodyStrong" style={{ marginTop: 4 }}>
        {title}
      </Text>
      <Text variant="small" color="textMuted">
        {detail}
      </Text>
    </View>
  );
}
