import { Pressable, View } from "react-native";
import { Text } from "./text";
import { useTheme } from "./ui-provider";

export interface UnderlineTab<T extends string> {
  value: T;
  label: string;
  /** Count badge (AC-1). */
  count?: number;
}

export interface UnderlineTabsProps<T extends string> {
  tabs: UnderlineTab<T>[];
  value: T;
  onChange: (value: T) => void;
}

/** Academics: Exams / Deadlines / Notices. */
export function UnderlineTabs<T extends string>({ tabs, value, onChange }: UnderlineTabsProps<T>) {
  const t = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: t.color.border }}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <Pressable
            key={tab.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(tab.value)}
            style={{
              flex: 1,
              height: 48,
              marginBottom: -1,
              flexDirection: "row",
              gap: 8,
              alignItems: "center",
              justifyContent: "center",
              borderBottomWidth: 2,
              borderBottomColor: active ? t.color.accent : "transparent",
            }}
          >
            <Text variant="bodyStrong" color={active ? "text" : "textMuted"}>
              {tab.label}
            </Text>
            {tab.count ? (
              <View
                style={{
                  backgroundColor: t.color.surfaceRaised,
                  borderRadius: 999,
                  paddingHorizontal: 8,
                }}
              >
                <Text variant="caption" color="textMuted">
                  {String(tab.count)}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
