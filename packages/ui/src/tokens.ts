/**
 * Design tokens. `design/tokens.json` is the source of truth; `theme.ts`
 * (React Native) and `css.ts` (Tailwind) are built from it.
 */
import tokens from "../../../design/tokens.json";

export type Tokens = typeof tokens;

export { tokens };
