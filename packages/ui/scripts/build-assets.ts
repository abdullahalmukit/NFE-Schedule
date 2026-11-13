/**
 * Builds every logo file from the one logo (LOGO_SVG in src/logo.ts):
 * pnpm --filter @nfe/ui build:assets
 * Outputs are committed; run again only when the logo or brand colours change.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { LOGO_SVG } from "../src/logo";
import { tokens } from "../src/tokens";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const ink = tokens.brand.ink;

function write(path: string, data: string | Buffer) {
  const full = root + path;
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, data);
  console.log(`wrote ${path}`);
}

/**
 * The logo as a PNG. `fill` = share of the canvas the logo takes; `background`
 * fills the rest (and the logo's rounded corners) for icons that may not be
 * transparent. Ink on Ink keeps the design identical.
 */
async function png(path: string, size: number, fill: number, background?: string) {
  const inner = Math.round(size * fill);
  const logo = await sharp(Buffer.from(LOGO_SVG), { density: 72 * (inner / 100) * 2 })
    .resize(inner, inner)
    .png()
    .toBuffer();
  const pad = Math.floor((size - inner) / 2);
  const out = await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: background ?? { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: logo, left: pad, top: pad }])
    .png()
    .toBuffer();
  write(path, out);
}

// The logo itself.
write("packages/ui/assets/logo.svg", LOGO_SVG);
write("apps/web/app/icon.svg", LOGO_SVG);

// Mobile (apps/mobile/app.config.ts). Store icons must be opaque: Ink behind the corners.
await png("apps/mobile/assets/icon.png", 1024, 1, ink);
// Adaptive icon: foreground inside the 66 % safe zone; background colour Ink in app.config.ts.
await png("apps/mobile/assets/adaptive-icon.png", 1024, 0.62);
// Splash: the logo on Ink (background colour in app.config.ts).
await png("apps/mobile/assets/splash-icon.png", 512, 1);

// Web (Next.js file conventions + PWA icons).
await png("apps/web/public/icons/favicon-32.png", 32, 1);
await png("apps/web/app/apple-icon.png", 180, 1, ink);
await png("apps/web/public/icons/icon-192.png", 192, 1);
await png("apps/web/public/icons/icon-512.png", 512, 1);
// Maskable: full bleed Ink, logo inside the 80 % safe circle.
await png("apps/web/public/icons/maskable-512.png", 512, 0.7, ink);
