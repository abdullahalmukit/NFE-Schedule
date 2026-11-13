import { View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import {
  LOGO_LEAF_PATH,
  LOGO_SQUARES,
  LOGO_VIEWBOX,
  logoColors,
  logoVariantFor,
  type LogoVariant,
} from "../logo";
import { tokens } from "../tokens";
import { FONT } from "./fonts";
import { Text } from "./text";
import { useTheme } from "./ui-provider";

export interface LogoMarkProps {
  size?: number;
  /** `auto` (default) follows the theme: reversed on dark, default on light. */
  variant?: LogoVariant | "auto";
}

export function LogoMark({ size = 32, variant = "auto" }: LogoMarkProps) {
  const t = useTheme();
  const c = logoColors(variant === "auto" ? logoVariantFor(t.name) : variant);
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${LOGO_VIEWBOX} ${LOGO_VIEWBOX}`}>
      {LOGO_SQUARES.map((s) => (
        <Rect
          key={`${s.x}-${s.y}`}
          x={s.x}
          y={s.y}
          width={s.size}
          height={s.size}
          rx={s.r}
          fill={c.squares}
        />
      ))}
      <Path d={LOGO_LEAF_PATH} fill={c.leaf} />
    </Svg>
  );
}

export interface LogoProps {
  strong: string;
  rest: string;
  tagline?: string;
  /** `auto` follows the theme; `reversed` for Ink backgrounds. */
  variant?: LogoVariant | "auto";
  size?: number;
}

/** Horizontal lockup: mark + "NFE Schedule" wordmark (+ optional tagline). */
export function Logo({ strong, rest, tagline, variant = "auto", size = 40 }: LogoProps) {
  const color =
    variant === "reversed"
      ? tokens.brand.ground
      : variant === "default"
        ? tokens.brand.ink
        : undefined;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <LogoMark size={size} variant={variant} />
      <View>
        <Text
          variant="title"
          rawColor={color}
          style={{ fontSize: size * 0.6, lineHeight: size * 0.72 }}
        >
          {strong}
          <Text
            variant="title"
            rawColor={color}
            style={{ fontSize: size * 0.6, fontFamily: FONT.display }}
          >
            {` ${rest}`}
          </Text>
        </Text>
        {tagline ? (
          <Text variant="small" color="textMuted">
            {tagline}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
