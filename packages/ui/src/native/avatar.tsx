import { Image, View } from "react-native";
import { Icon } from "./icon";
import { Text } from "./text";
import { useTheme } from "./ui-provider";

export interface AvatarProps {
  /** Teacher initial ("DAMR"); without it a person icon is shown. */
  initial?: string;
  imageUrl?: string;
  size?: number;
  label?: string;
}

export function Avatar({ initial, imageUrl, size = 48, label }: AvatarProps) {
  const t = useTheme();
  return (
    <View
      accessible={Boolean(label)}
      accessibilityRole={label ? "image" : undefined}
      accessibilityLabel={label}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
        backgroundColor: initial ? t.color.accentSoft : t.color.surfaceRaised,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={{ width: size, height: size }} />
      ) : initial ? (
        <Text
          variant="title"
          color="accent"
          style={{ fontSize: size * 0.28, lineHeight: size * 0.36 }}
        >
          {initial}
        </Text>
      ) : (
        <Icon name="user" size={size * 0.45} color={t.color.textMuted} />
      )}
    </View>
  );
}
