import Papa from "papaparse";
import { gridToTable, MasterReadError, type HeaderScore, type MasterTable } from "./table";

/** UTF-8 text; TextDecoder drops the byte order mark Excel writes. */
export function decodeText(file: Uint8Array): string {
  return new TextDecoder("utf-8").decode(file);
}

const DELIMITERS = [",", ";", "\t"] as const;

/** The delimiter used most often (outside quotes) in the first non-empty line. */
export function detectDelimiter(text: string): string {
  const first = text.split(/\r?\n/).find((l) => l.trim()) ?? "";
  const unquoted = first.replace(/"(?:[^"]|"")*"/g, "");
  let best: string = ",";
  let count = 0;
  for (const d of DELIMITERS) {
    const n = unquoted.split(d).length - 1;
    if (n > count) {
      best = d;
      count = n;
    }
  }
  return best;
}

/** .csv: delimiter `,` `;` or tab is detected; a UTF-8 BOM is removed. */
export function readCsv(file: Uint8Array, score: HeaderScore): MasterTable {
  const text = decodeText(file);
  if (!text.trim()) throw new MasterReadError("empty");
  const parsed = Papa.parse<string[]>(text, {
    delimiter: detectDelimiter(text),
    skipEmptyLines: false,
  });
  return gridToTable(parsed.data, score);
}
