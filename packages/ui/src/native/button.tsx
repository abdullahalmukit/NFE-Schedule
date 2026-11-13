import { Pressable, View } from "react-native";
import type { IconName } from "../icon-names";
import { Icon } from "./icon";
import { Text } from "./text";
import { useTheme } from "./ui-provider";

export interface ButtonProps {
  label: string;
  variant?: "primary" | "secondary";
  icon?: IconName;
  /** Primary buttons are full width and 56 px tall (DESIGN_SYSTEM §5). */
  size?: "large" | "medium";
  disabled?: boolean;
  onPress?: () => void;
  flex?: boolean;
}

export function Button({
  label,
  variant = "primary",
  icon,
  size = "large",
  disabled,
  onPress,
  flex,
}: ButtonProps) {
  const t = useTheme();
  const primary = variant === "primary";
  const fg = primary ? t.color.onAccent : t.color.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: flex ? 1 : undefined,
        alignSelf: size === "large" ? "stretch" : undefined,
        height: size === "large" ? 56 : 48,
        borderRadius: t.radius.button,
        paddingHorizontal: 20,
        backgroundColor: primary ? t.color.accent : t.color.surface,
        borderWidth: primary ? 0 : 1,
        borderColor: t.color.border,
        opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        justifyContent: "center",
      })}
    >
      <View
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}
      >
        {icon ? <Icon name={icon} color={fg} size={18} /> : null}
        <Text variant={size === "large" ? "bodyBold" : "bodyStrong"} rawColor={fg}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
