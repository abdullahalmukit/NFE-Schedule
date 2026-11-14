/**
 * Clean-up rules for master data (docs/MASTER_DATA_IMPORT.md "Normalisation"),
 * shared by the admin forms (master-data-manual) and the file import.
 */

const BANGLA_DIGITS = "০১২৩৪৫৬৭৮৯";

/** "২৬৩" → "263"; other characters are kept. */
export function toLatinDigits(text: string): string {
  return text.replace(/[০-৯]/g, (d) => String(BANGLA_DIGITS.indexOf(d)));
}

/** Teacher initial: trimmed, upper case, inner spaces removed ("damr " → "DAMR"). */
export function normalizeInitial(raw: string): string {
  return raw.trim().replace(/\s+/g, "").toUpperCase();
}

/** "NI(ITM)" → { initial: "NI", department: "ITM" }; "DAMR" → { initial: "DAMR", department: null }. */
export function splitInitial(raw: string): { initial: string; department: string | null } {
  const m = normalizeInitial(raw).match(/^([A-Z]+)\(([A-Z]+)\)$/);
  return m
    ? { initial: m[1]!, department: m[2]! }
    : { initial: normalizeInitial(raw), department: null };
}

/**
 * Course code to "[PREFIX ]dddd-ddd[d]": "0531 1104" → "0531-1104",
 * "aol0223-111" → "AOL 0223-111". A trailing section letter ("0531-1104-A")
 * is removed and reported. Returns null when no code can be found.
 */
export function normalizeCourseCode(
  raw: string,
): { code: string; removedSection: string | null } | null {
  const text = toLatinDigits(raw).trim().toUpperCase().replace(/\s+/g, " ");
  const m = text.match(
    /^(?:([A-Z]{2,5})\s*)?(\d{4})\s*[-–\s]?\s*(\d{3,4})(?:\s*[-–]\s*([A-Z])\d?)?$/,
  );
  if (!m) return null;
  const [, prefix, a, b, section] = m;
  return { code: `${prefix ? `${prefix} ` : ""}${a}-${b}`, removedSection: section ?? null };
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Keeps digits and a leading "+": "+880 1711-000000" → "+8801711000000". */
export function normalizePhone(raw: string): string {
  const text = toLatinDigits(raw).trim();
  const digits = text.replace(/\D/g, "");
  return text.startsWith("+") ? `+${digits}` : digits;
}

/**
 * Floor of a room from its number (`room.floor_rule`): "first_digit" takes the
 * first digit of a 3+ digit number ("304" → 3, "1002" → 1, "G01" → null);
 * "manual" never guesses.
 */
export function floorFromRoomNumber(number: string, mode: "first_digit" | "manual"): number | null {
  if (mode === "manual") return null;
  const m = toLatinDigits(number)
    .trim()
    .match(/^(\d)(\d{2,3})[A-Z]?$/i);
  return m ? Number(m[1]) : null;
}
