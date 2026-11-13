/**
 * Logo mark geometry (design/logo-sheet.png): three rounded squares and a
 * leaf in a 2×2 grid, on a 100 × 100 view box. Used by the web and mobile
 * <Logo> components and by the icon generator, so every copy is identical.
 */
import { tokens } from "./tokens";

export const LOGO_VIEWBOX = 100;

const CELL = 44;
const GAP = 12;
const R = 12;
const FAR = CELL + GAP;

export const LOGO_SQUARES = [
  { x: 0, y: 0, size: CELL, r: R },
  { x: 0, y: FAR, size: CELL, r: R },
  { x: FAR, y: FAR, size: CELL, r: R },
] as const;

/** Leaf in the top-right cell: a lens from its bottom-left to its top-right corner. */
export const LOGO_LEAF_PATH = `M${FAR} ${CELL}A${CELL} ${CELL} 0 0 1 ${FAR + CELL} 0A${CELL} ${CELL} 0 0 1 ${FAR} ${CELL}Z`;

/** `default` on light backgrounds, `reversed` on Ink / dark backgrounds. */
export type LogoVariant = "default" | "reversed";

export function logoColors(variant: LogoVariant): { squares: string; leaf: string } {
  return variant === "reversed"
    ? { squares: tokens.brand.ground, leaf: tokens.brand.leafLight }
    : { squares: tokens.brand.ink, leaf: tokens.brand.leaf };
}

/** Logo colours that suit a theme's background. */
export function logoVariantFor(theme: "dark" | "light"): LogoVariant {
  return theme === "dark" ? "reversed" : "default";
}

/** Stand-alone SVG markup of the mark (for generated assets). */
export function logoMarkSvg(
  variant: LogoVariant,
  options: { size?: number; background?: string; padding?: number; radius?: number } = {},
): string {
  const { size = 512, background, padding = 0, radius = 0 } = options;
  const { squares, leaf } = logoColors(variant);
  const inner = LOGO_VIEWBOX;
  const total = inner + padding * 2;
  const bg = background
    ? `<rect width="${total}" height="${total}" rx="${radius}" fill="${background}"/>`
    : "";
  const rects = LOGO_SQUARES.map(
    (s) =>
      `<rect x="${s.x + padding}" y="${s.y + padding}" width="${s.size}" height="${s.size}" rx="${s.r}" fill="${squares}"/>`,
  ).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${total} ${total}">${bg}${rects}<path transform="translate(${padding} ${padding})" d="${LOGO_LEAF_PATH}" fill="${leaf}"/></svg>`;
}
