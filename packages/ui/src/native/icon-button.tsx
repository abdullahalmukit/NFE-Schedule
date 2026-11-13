import { Pressable, View } from "react-native";
import type { IconName } from "../icon-names";
import { Icon } from "./icon";
import { useTheme } from "./ui-provider";

export interface IconButtonProps {
  icon: IconName;
  /** Screen-reader label (NF-6). */
  label: string;
  /** Small amber dot, e.g. unread notifications. */
  dot?: boolean;
  onPress?: () => void;
}

export function IconButton({ icon, label, dot, onPress }: IconButtonProps) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: pressed ? t.color.surfaceRaised : t.color.surface,
        alignItems: "center",
        justifyContent: "center",
      })}
    >
      <Icon name={icon} color={t.color.text} size={20} />
      {dot ? (
        <View
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            width: 9,
            height: 9,
            borderRadius: 5,
            backgroundColor: t.color.warning,
            borderWidth: 2,
            borderColor: t.color.surface,
          }}
        />
      ) : null}
    </Pressable>
  );
}
