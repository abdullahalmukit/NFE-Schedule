import { decodeText } from "./read-csv";
import { cleanCell, MasterReadError, MAX_IMPORT_ROWS, type MasterTable } from "./table";

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

/**
 * .json: an array of objects, or an object holding one (`{faculty: [...]}`,
 * `{courses: [...]}`, or any single array of objects). Keys become headers in
 * the order they first appear; `true` / `false` become "yes" / "no".
 */
export function readJson(file: Uint8Array, kind?: "faculty" | "courses"): MasterTable {
  let data: unknown;
  try {
    data = JSON.parse(decodeText(file));
  } catch {
    throw new MasterReadError("badJson");
  }
  if (isObj(data)) {
    const arrays = Object.entries(data).filter(([, v]) => Array.isArray(v) && v.some(isObj));
    const named = kind ? arrays.find(([k]) => k.toLowerCase() === kind) : undefined;
    data = (named ?? (arrays.length === 1 ? arrays[0] : undefined))?.[1];
  }
  if (!Array.isArray(data)) throw new MasterReadError("badJson");
  const records = data.filter(isObj);
  if (!records.length) throw new MasterReadError("empty");
  if (records.length > MAX_IMPORT_ROWS) throw new MasterReadError("tooManyRows");

  const headers: string[] = [];
  for (const r of records)
    for (const k of Object.keys(r)) if (!headers.includes(k)) headers.push(k);
  const cell = (v: unknown) =>
    typeof v === "boolean" ? (v ? "yes" : "no") : isObj(v) || Array.isArray(v) ? "" : cleanCell(v);
  return { headers, rows: records.map((r) => headers.map((h) => cell(r[h]))), source: {} };
}
