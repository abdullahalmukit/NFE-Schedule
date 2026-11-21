/**
 * Course colour (DESIGN_SYSTEM §6): a stable index into the course palette
 * from the course code, so a course has the same colour on every screen and
 * every device. `@nfe/ui` turns the index into colours (`courseTone`).
 */

/** FNV-1a hash of the code (upper case, spaces removed) → 0 … count−1. */
export function courseColorIndex(code: string, count = 8): number {
  const key = code.toUpperCase().replace(/\s+/g, "");
  let hash = 0x811c9dc5;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash % Math.max(1, count);
}
