import { Pressable, View } from "react-native";
import type { IconName } from "../icon-names";
import { Icon } from "./icon";
import { Text } from "./text";
import { useTheme } from "./ui-provider";

export interface BottomNavItem<T extends string> {
  value: T;
  label: string;
  icon: IconName;
}

export interface BottomNavProps<T extends string> {
  items: BottomNavItem<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Safe-area inset below the bar. */
  bottomInset?: number;
}

/** Five tabs, icon + label, active in accent. Tabs come from `nav.tabs`. */
export function BottomNav<T extends string>({
  items,
  value,
  onChange,
  bottomInset = 0,
}: BottomNavProps<T>) {
  const t = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={{
        flexDirection: "row",
        height: t.layout.bottomNavHeight + bottomInset,
        paddingBottom: bottomInset,
        borderTopWidth: 1,
        borderTopColor: t.color.border,
        backgroundColor: t.color.surface,
      }}
    >
      {items.map((it) => {
        const active = it.value === value;
        const color = active ? t.color.accent : t.color.textMuted;
        return (
          <Pressable
            key={it.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(it.value)}
            style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 4 }}
          >
            <Icon name={it.icon} size={22} color={color} />
            <Text variant="smallStrong" rawColor={color} style={{ fontSize: 12, lineHeight: 16 }}>
              {it.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
