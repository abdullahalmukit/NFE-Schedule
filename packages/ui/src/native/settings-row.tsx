import { Pressable, View } from "react-native";
import { Icon } from "./icon";
import { Text } from "./text";
import { useTheme } from "./ui-provider";

export interface SettingsRowProps {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  last?: boolean;
}

export function SettingsRow({ title, subtitle, onPress, last }: SettingsRowProps) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 56,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: pressed ? t.color.surfaceRaised : "transparent",
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: t.color.border,
      })}
    >
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{title}</Text>
        {subtitle ? (
          <Text variant="small" color="textMuted">
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Icon name="chevronRight" size={20} color={t.color.textMuted} />
    </Pressable>
  );
}
