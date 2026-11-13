/** Small colour helpers (hex only) used to derive tints and check contrast. */

type Rgb = [number, number, number];

function channels(hex: string): Rgb {
  let h = hex.replace("#", "");
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  const n = Number.parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(rgb: Rgb): string {
  return `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

/** Mixes `a` towards `b`; `amount` 0 = a, 1 = b. */
export function mix(a: string, b: string, amount: number): string {
  const [ar, ag, ab] = channels(a);
  const [br, bg, bb] = channels(b);
  return toHex([ar + (br - ar) * amount, ag + (bg - ag) * amount, ab + (bb - ab) * amount]);
}

function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colours (1 … 21). */
export function contrastRatio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
