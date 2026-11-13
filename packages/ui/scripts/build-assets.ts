/**
 * Generates the logo SVGs, app icons, splash and favicons from the logo
 * geometry in src/logo.ts: pnpm --filter @nfe/ui build:assets
 * Outputs are committed; run again only when the logo or brand colours change.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { logoMarkSvg, LOGO_VIEWBOX } from "../src/logo";
import { tokens } from "../src/tokens";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const ink = tokens.brand.ink;

/** Padding (in view-box units) so the mark fills `fraction` of the canvas. */
const pad = (fraction: number) => (LOGO_VIEWBOX / fraction - LOGO_VIEWBOX) / 2;

function write(path: string, data: string | Buffer) {
  const full = root + path;
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, data);
  console.log(`wrote ${path}`);
}

async function png(path: string, svg: string, size: number) {
  write(path, await sharp(Buffer.from(svg), { density: 300 }).resize(size, size).png().toBuffer());
}

// Source marks (for documents and the admin branding default).
write("packages/ui/assets/logo-mark.svg", logoMarkSvg("default", { size: 100 }));
write("packages/ui/assets/logo-mark-reversed.svg", logoMarkSvg("reversed", { size: 100 }));

// Mobile (apps/mobile/app.config.ts).
const iconPad = pad(0.5);
await png(
  "apps/mobile/assets/icon.png",
  logoMarkSvg("reversed", { size: 1024, background: ink, padding: iconPad }),
  1024,
);
// Adaptive icon foreground: the mark inside the 66 % safe zone, background colour = Ink.
await png(
  "apps/mobile/assets/adaptive-icon.png",
  logoMarkSvg("reversed", { size: 1024, padding: pad(0.4) }),
  1024,
);
await png("apps/mobile/assets/splash-icon.png", logoMarkSvg("reversed", { size: 512 }), 512);

// Web (Next.js file conventions + PWA icons).
const roundedPad = pad(0.55);
const rounded = (size: number) =>
  logoMarkSvg("reversed", {
    size,
    background: ink,
    padding: roundedPad,
    radius: (LOGO_VIEWBOX + roundedPad * 2) * 0.22,
  });
write("apps/web/app/icon.svg", rounded(32));
await png("apps/web/public/icons/favicon-32.png", rounded(32), 32);
await png(
  "apps/web/app/apple-icon.png",
  logoMarkSvg("reversed", { size: 180, background: ink, padding: iconPad }),
  180,
);
await png("apps/web/public/icons/icon-192.png", rounded(192), 192);
await png("apps/web/public/icons/icon-512.png", rounded(512), 512);
// Maskable: full bleed, mark inside the 80 % safe circle.
await png(
  "apps/web/public/icons/maskable-512.png",
  logoMarkSvg("reversed", { size: 512, background: ink, padding: pad(0.45) }),
  512,
);
