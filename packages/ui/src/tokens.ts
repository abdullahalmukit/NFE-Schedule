/**
 * Design tokens. `design/tokens.json` is the source of truth; the
 * design-system branch turns them into a Tailwind preset and an RN theme.
 */
import tokens from "../../../design/tokens.json";

export type Tokens = typeof tokens;
export type ThemeName = keyof Tokens["color"] & ("dark" | "light");

export { tokens };
