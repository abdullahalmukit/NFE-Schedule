import { Pressable, View } from "react-native";
import type { IconName } from "../icon-names";
import { toneColors, type Tone } from "../theme";
import { Icon } from "./icon";
import { Text } from "./text";
import { useTheme } from "./ui-provider";

export interface MenuTileProps {
  icon: IconName;
  label: string;
  /** Tinted icon square: amber, green, purple, blue in the mockup. */
  tone: Tone;
  onPress?: () => void;
}

export function MenuTile({ icon, label, tone, onPress }: MenuTileProps) {
  const t = useTheme();
  const c = toneColors(t.name, tone);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 104,
        padding: 16,
        gap: 16,
        justifyContent: "space-between",
        borderRadius: t.radius.card,
        backgroundColor: pressed ? t.color.surfaceRaised : t.color.surface,
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          backgroundColor: c.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={icon} size={20} color={c.fg} />
      </View>
      <Text variant="bodyStrong">{label}</Text>
    </Pressable>
  );
}
