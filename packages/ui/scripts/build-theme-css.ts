/** Writes packages/ui/src/web/theme.css from design/tokens.json: pnpm --filter @nfe/ui build:css */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { buildThemeCss } from "../src/css";

const out = fileURLToPath(new URL("../src/web/theme.css", import.meta.url));
writeFileSync(out, buildThemeCss());
console.log(`wrote ${out}`);
