import * as XLSX from "xlsx";
import { gridToTable, MasterReadError, type HeaderScore, type MasterTable } from "./table";

/**
 * .xlsx / .xls: cells as Excel shows them. With several sheets the one whose
 * header matches best is used unless the admin picked `sheet`.
 */
export function readXlsx(file: Uint8Array, score: HeaderScore, sheet?: string): MasterTable {
  let book: XLSX.WorkBook;
  try {
    book = XLSX.read(file, { type: "array", cellDates: false, dense: true });
  } catch {
    throw new MasterReadError("badFile");
  }
  const sheets = book.SheetNames;
  if (!sheets.length) throw new MasterReadError("empty");
  const grid = (name: string) =>
    XLSX.utils.sheet_to_json<unknown[]>(book.Sheets[name]!, {
      header: 1,
      raw: false,
      defval: "",
      blankrows: true,
    });

  const candidates = sheet && sheets.includes(sheet) ? [sheet] : sheets;
  let best: MasterTable | null = null;
  let bestScore = -1;
  for (const name of candidates) {
    let table: MasterTable;
    try {
      table = gridToTable(grid(name), score, { sheet: name });
    } catch (e) {
      if (e instanceof MasterReadError && e.code === "empty") continue;
      throw e;
    }
    const s = score(table.headers) * 1_000_000 + table.rows.length;
    if (s > bestScore) {
      best = table;
      bestScore = s;
    }
  }
  if (!best) throw new MasterReadError("empty");
  return { ...best, sheets };
}
