import { Pressable, View } from "react-native";
import { Pill } from "./pill";
import { Text } from "./text";
import { useTheme } from "./ui-provider";

export interface RoomCardProps {
  building: string;
  number: string;
  /** "Lab" */
  badge?: string;
  onPress?: () => void;
}

export function RoomCard({ building, number, badge, onPress }: RoomCardProps) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 88,
        padding: 16,
        borderRadius: t.radius.card,
        backgroundColor: pressed ? t.color.surfaceRaised : t.color.surface,
      })}
    >
      <Text variant="small" color="textMuted">
        {building}
      </Text>
      <Text variant="title">{number}</Text>
      {badge ? (
        <View style={{ marginTop: 4 }}>
          <Pill label={badge} tone="info" size="sm" />
        </View>
      ) : null}
    </Pressable>
  );
}
