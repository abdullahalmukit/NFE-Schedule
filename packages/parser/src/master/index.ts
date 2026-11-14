/**
 * Faculty / course file readers (ADM-MD-1). Server only: they use Node's
 * Buffer, word-extractor and pdf.js. Import from "@nfe/parser/master".
 */
import { readCsv } from "./read-csv";
import { readJson } from "./read-json";
import { readPdf } from "./read-pdf";
import { readDoc, readDocx } from "./read-word";
import { readXlsx } from "./read-xlsx";
import { MasterReadError, type HeaderScore, type MasterTable } from "./table";

export * from "./table";
export { keyValueTable } from "./read-word";
export { writeXlsx } from "./read-xlsx";

export const MASTER_FILE_TYPES = ["csv", "xlsx", "xls", "json", "docx", "doc", "pdf"] as const;
export type MasterFileType = (typeof MASTER_FILE_TYPES)[number];

/** "Faculty List.XLSX" → "xlsx"; null for anything the import does not read. */
export function masterFileType(fileName: string): MasterFileType | null {
  const ext = fileName.toLowerCase().match(/\.([a-z]+)$/)?.[1];
  return (MASTER_FILE_TYPES as readonly string[]).includes(ext ?? "")
    ? (ext as MasterFileType)
    : null;
}

export interface ReadOptions {
  score: HeaderScore;
  /** Workbook sheet chosen by the admin. */
  sheet?: string;
  /** Picks `{faculty: [...]}` or `{courses: [...]}` in a JSON file holding both. */
  kind?: "faculty" | "courses";
}

/** Any supported file → `{headers, rows, source}`. Throws `MasterReadError`. */
export async function readMasterFile(
  file: Uint8Array,
  type: MasterFileType,
  opts: ReadOptions,
): Promise<MasterTable> {
  switch (type) {
    case "csv":
      return readCsv(file, opts.score);
    case "xlsx":
    case "xls":
      return readXlsx(file, opts.score, opts.sheet);
    case "json":
      return readJson(file, opts.kind);
    case "docx":
      return readDocx(file, opts.score);
    case "doc":
      return readDoc(file, opts.score);
    case "pdf":
      return readPdf(file, opts.score);
    default:
      throw new MasterReadError("unsupported");
  }
}
