import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { useTheme } from "./ui-provider";

export interface CardProps {
  children: ReactNode;
  /** `outlined`: border instead of fill (free time, banners). */
  variant?: "filled" | "outlined";
  padding?: "none" | "md" | "lg";
  style?: StyleProp<ViewStyle>;
}

export function Card({ children, variant = "filled", padding = "lg", style }: CardProps) {
  const t = useTheme();
  const light = t.name === "light";
  return (
    <View
      style={[
        {
          borderRadius: t.radius.card,
          padding: padding === "lg" ? 16 : padding === "md" ? 12 : 0,
          overflow: "hidden",
        },
        variant === "filled"
          ? {
              backgroundColor: t.color.surface,
              // Cards: no shadow in dark mode, a faint one in light mode.
              ...(light ? { boxShadow: "0 1px 2px rgba(20, 50, 31, 0.06)" } : null),
            }
          : { borderWidth: 1, borderColor: t.color.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}
