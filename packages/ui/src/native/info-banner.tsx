import { Pressable, View } from "react-native";
import type { IconName } from "../icon-names";
import { Icon } from "./icon";
import { Text } from "./text";
import { useTheme } from "./ui-provider";

export interface InfoBannerProps {
  icon: IconName;
  /** Amber for attention, accent for refresh / version. */
  tone?: "warning" | "accent";
  title: string;
  body?: string;
  /** Outlined (version banner) or filled (onboarding note). */
  variant?: "filled" | "outlined";
  onPress?: () => void;
}

export function InfoBanner({
  icon,
  tone = "accent",
  title,
  body,
  variant = "filled",
  onPress,
}: InfoBannerProps) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 12,
        padding: 16,
        borderRadius: t.radius.card,
        backgroundColor: variant === "filled" ? t.color.surface : "transparent",
        borderWidth: variant === "outlined" ? 1 : 0,
        borderColor: t.color.border,
      }}
    >
      <View style={{ marginTop: 2 }}>
        <Icon name={icon} size={22} color={tone === "warning" ? t.color.warning : t.color.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{title}</Text>
        {body ? (
          <Text variant="small" color="textMuted">
            {body}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
