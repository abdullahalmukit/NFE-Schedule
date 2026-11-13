import type { ReactNode } from "react";
import { Text as RNText, type StyleProp, type TextStyle } from "react-native";
import type { ColorName } from "../theme";
import { FONT } from "./fonts";
import { useUi } from "./ui-provider";

export type TextVariant =
  | "display"
  | "title"
  | "heading"
  | "body"
  | "bodyStrong"
  | "bodyBold"
  | "small"
  | "smallStrong"
  | "caption";

type Weight = "regular" | "semibold" | "bold";

const VARIANTS: Record<
  TextVariant,
  {
    size: "display" | "title" | "heading" | "body" | "small" | "caption";
    weight: Weight;
    displayFont?: boolean;
  }
> = {
  display: { size: "display", weight: "bold", displayFont: true },
  title: { size: "title", weight: "bold", displayFont: true },
  heading: { size: "heading", weight: "semibold" },
  body: { size: "body", weight: "regular" },
  bodyStrong: { size: "body", weight: "semibold" },
  bodyBold: { size: "body", weight: "bold" },
  small: { size: "small", weight: "regular" },
  smallStrong: { size: "small", weight: "semibold" },
  caption: { size: "caption", weight: "semibold" },
};

function family(weight: Weight, displayFont: boolean, bangla: boolean): string {
  if (bangla)
    return weight === "bold"
      ? FONT.banglaBold
      : weight === "semibold"
        ? FONT.banglaSemiBold
        : FONT.bangla;
  if (displayFont) return weight === "regular" ? FONT.display : FONT.displayBold;
  return weight === "bold" ? FONT.bodyBold : weight === "semibold" ? FONT.bodySemiBold : FONT.body;
}

export interface TextProps {
  children: ReactNode;
  variant?: TextVariant;
  color?: ColorName;
  /** Raw colour, e.g. a course colour. */
  rawColor?: string;
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
  strikeThrough?: boolean;
  /** Announce as a heading to screen readers. */
  header?: boolean;
}

/** Text with the type scale of DESIGN_SYSTEM §3; switches to Hind Siliguri in Bangla. */
export function Text({
  children,
  variant = "body",
  color = "text",
  rawColor,
  numberOfLines,
  style,
  strikeThrough,
  header,
}: TextProps) {
  const { theme, locale } = useUi();
  const v = VARIANTS[variant];
  const size = theme.size[v.size];
  const bangla = locale === "bn";
  const lineHeight = Math.round(size * (size >= 24 ? 1.2 : 1.45) * (bangla ? 1.1 : 1));
  return (
    <RNText
      numberOfLines={numberOfLines}
      accessibilityRole={header ? "header" : undefined}
      maxFontSizeMultiplier={1.3}
      style={[
        {
          fontFamily: family(v.weight, Boolean(v.displayFont), bangla),
          fontSize: size,
          lineHeight,
          color: rawColor ?? theme.color[color],
        },
        variant === "caption" && !bangla
          ? { textTransform: "uppercase", letterSpacing: size * 0.06 }
          : null,
        strikeThrough ? { textDecorationLine: "line-through" } : null,
        style,
      ]}
    >
      {children}
    </RNText>
  );
}
