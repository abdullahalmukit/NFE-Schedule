/**
 * Shared shape of the master-data readers (docs/MASTER_DATA_IMPORT.md §3):
 * every reader returns `{headers, rows, source}`, so column matching, preview
 * and apply are written once (in `@nfe/core`).
 */

export interface MasterTable {
  headers: string[];
  rows: string[][];
  /** Where the table was found: the sheet of a workbook, the page of a PDF. */
  source: { sheet?: string; page?: number };
  /** Sheets of a workbook, so the admin can pick another one. */
  sheets?: string[];
}

/** Scores a candidate header row: how many target fields it matches (core `headerScore`). */
export type HeaderScore = (cells: string[]) => number;

export type ReadErrorCode =
  "unsupported" | "badFile" | "badJson" | "empty" | "scan" | "tooManyRows";

/** A file that cannot be read; `code` is shown to the admin as a translated message. */
export class MasterReadError extends Error {
  constructor(public readonly code: ReadErrorCode) {
    super(`master import: ${code}`);
    this.name = "MasterReadError";
  }
}

/** A larger file is almost certainly not a faculty or course list. */
export const MAX_IMPORT_ROWS = 5000;

/** Header search looks at this many rows from the top (titles above the table are common). */
const HEADER_SEARCH_ROWS = 25;

export const cleanCell = (v: unknown): string =>
  v === null || v === undefined ? "" : String(v).replace(/\s+/g, " ").trim();

/**
 * Turns a grid of cells into a table: the header row is the one (near the top)
 * that matches the most fields, else the first non-empty row. Columns with an
 * empty header and no data are dropped; empty headers that have data get
 * "Column N" so the admin can still match them.
 */
export function gridToTable(
  grid: readonly (readonly unknown[])[],
  score: HeaderScore,
  source: MasterTable["source"] = {},
): MasterTable {
  const cells = grid.map((r) => r.map(cleanCell));
  const nonEmpty = (r: string[]) => r.some((c) => c !== "");
  let headerAt = -1;
  let best = 0;
  for (let i = 0; i < Math.min(cells.length, HEADER_SEARCH_ROWS); i++) {
    if (!nonEmpty(cells[i]!)) continue;
    const s = score(cells[i]!);
    if (s > best) {
      best = s;
      headerAt = i;
    }
  }
  if (headerAt < 0) headerAt = cells.findIndex(nonEmpty);
  if (headerAt < 0) throw new MasterReadError("empty");

  const body = cells.slice(headerAt + 1);
  while (body.length && !nonEmpty(body[body.length - 1]!)) body.pop();
  if (body.length > MAX_IMPORT_ROWS) throw new MasterReadError("tooManyRows");

  const width = Math.max(cells[headerAt]!.length, ...body.map((r) => r.length));
  const keep: number[] = [];
  const headers: string[] = [];
  const used = new Set<string>();
  for (let c = 0; c < width; c++) {
    let h = cells[headerAt]![c] ?? "";
    if (!h && !body.some((r) => r[c])) continue;
    if (!h) h = `Column ${c + 1}`;
    // Two columns with the same header: number the second one.
    let name = h;
    for (let n = 2; used.has(name); n++) name = `${h} (${n})`;
    used.add(name);
    headers.push(name);
    keep.push(c);
  }
  return { headers, rows: body.map((r) => keep.map((c) => r[c] ?? "")), source };
}
