/**
 * The one NFE Schedule logo: the app icon design from design/logo-sheet.png —
 * an Ink rounded square holding three light squares and a green leaf in a
 * 2×2 grid. Every copy (web <Logo>, mobile <Logo>, packages/ui/assets/logo.svg,
 * app icon, adaptive icon, splash, favicon, PWA icons) is built from LOGO_SVG.
 * The admin can replace it in the apps with `branding.logo_path`.
 */
import { tokens } from "./tokens";

/** Grid of the mark inside its own 100 × 100 box. */
const CELL = 44;
const GAP = 12;
const R = 12;
const FAR = CELL + GAP;
const SQUARES = [
  [0, 0],
  [0, FAR],
  [FAR, FAR],
] as const;
/** Leaf in the top-right cell: a lens from its bottom-left to its top-right corner. */
const LEAF = `M${FAR} ${CELL}A${CELL} ${CELL} 0 0 1 ${FAR + CELL} 0A${CELL} ${CELL} 0 0 1 ${FAR} ${CELL}Z`;

/** Mark size and corner radius relative to the logo (measured from the sheet's app icon). */
const MARK_SCALE = 0.49;
const CORNER = 23;
const OFFSET = (100 - 100 * MARK_SCALE) / 2;

/** The logo: 100 × 100 view box, transparent outside the rounded square. */
export const LOGO_SVG = [
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">`,
  `<rect width="100" height="100" rx="${CORNER}" fill="${tokens.brand.ink}"/>`,
  `<g transform="translate(${OFFSET} ${OFFSET}) scale(${MARK_SCALE})">`,
  ...SQUARES.map(
    ([x, y]) =>
      `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="${R}" fill="${tokens.brand.ground}"/>`,
  ),
  `<path d="${LEAF}" fill="${tokens.brand.leafLight}"/>`,
  `</g>`,
  `</svg>`,
].join("");

/** `url(...)` value for CSS (web default logo). */
export const LOGO_CSS_URL = `url("data:image/svg+xml,${encodeURIComponent(LOGO_SVG)}")`;
