import { Pressable, View } from "react-native";
import { Text } from "./text";

export interface SectionHeaderProps {
  title: string;
  /** Right-aligned link, e.g. "Full week". */
  actionLabel?: string;
  onAction?: () => void;
  /** Right-aligned muted text, e.g. "12 classes". */
  meta?: string;
}

export function SectionHeader({ title, actionLabel, onAction, meta }: SectionHeaderProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      <Text variant="heading" header>
        {title}
      </Text>
      {actionLabel ? (
        <Pressable accessibilityRole="link" onPress={onAction} hitSlop={12}>
          <Text variant="smallStrong" color="accent">
            {actionLabel}
          </Text>
        </Pressable>
      ) : meta ? (
        <Text variant="small" color="textMuted">
          {meta}
        </Text>
      ) : null}
    </View>
  );
}
