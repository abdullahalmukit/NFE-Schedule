import { View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";
import { LOGO_LEAF_PATH, LOGO_SQUARES, LOGO_VIEWBOX, logoColors, type LogoVariant } from "../logo";
import { tokens } from "../tokens";
import { FONT } from "./fonts";
import { Text } from "./text";

export interface LogoMarkProps {
  size?: number;
  variant?: LogoVariant;
}

export function LogoMark({ size = 32, variant = "default" }: LogoMarkProps) {
  const c = logoColors(variant);
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
  variant?: LogoVariant;
  size?: number;
}

/** Horizontal lockup: mark + "NFE Schedule" wordmark (+ optional tagline). */
export function Logo({ strong, rest, tagline, variant = "default", size = 40 }: LogoProps) {
  const color = variant === "reversed" ? tokens.brand.ground : undefined;
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
