import WordExtractor from "word-extractor";
import { extractDocxParagraphs } from "../docx/paragraphs";
import { extractDocxTables } from "../docx/tables";
import { gridToTable, MasterReadError, type HeaderScore, type MasterTable } from "./table";

/**
 * .docx: the table whose header row matches the most fields (cell lines joined
 * with a space). Without a matching table, "Key: Value" paragraphs are read,
 * one record per blank-line block.
 */
export function readDocx(file: Uint8Array, score: HeaderScore): MasterTable {
  let tables;
  try {
    tables = extractDocxTables(file);
  } catch {
    throw new MasterReadError("badFile");
  }
  let best: MasterTable | null = null;
  let bestScore = 0;
  for (const t of tables) {
    // Keep merged cells in their columns: a cell spanning 2 columns adds an empty one.
    const grid = t.rows.map((r) =>
      r.flatMap((c) => [c.vMergeContinue ? "" : c.lines.join(" "), ...Array(c.span - 1).fill("")]),
    );
    let table: MasterTable;
    try {
      table = gridToTable(grid, score);
    } catch {
      continue;
    }
    const s = score(table.headers);
    if (s > bestScore || (s === bestScore && best && table.rows.length > best.rows.length)) {
      best = table;
      bestScore = s;
    }
  }
  if (best && bestScore > 0) return best;
  const fromParagraphs = keyValueTable(extractDocxParagraphs(file));
  if (fromParagraphs && score(fromParagraphs.headers) > 0) return fromParagraphs;
  if (best) return best;
  throw new MasterReadError("empty");
}

/** "Initial: DAMR" lines; a blank line ends a record. Null when there are none. */
export function keyValueTable(lines: readonly string[]): MasterTable | null {
  const records: Map<string, string>[] = [];
  let current: Map<string, string> | null = null;
  for (const line of lines) {
    const m = line.match(/^([^:：]{1,40})[:：]\s*(.*)$/);
    if (!line.trim()) {
      current = null;
      continue;
    }
    if (!m) continue;
    const key = m[1]!.trim();
    if (!current || current.has(key)) {
      current = new Map();
      records.push(current);
    }
    current.set(key, m[2]!.trim());
  }
  if (!records.length) return null;
  const headers: string[] = [];
  for (const r of records) for (const k of r.keys()) if (!headers.includes(k)) headers.push(k);
  return { headers, rows: records.map((r) => headers.map((h) => r.get(h) ?? "")), source: {} };
}

/**
 * .doc (Word 97–2003): no table XML, only text. Table rows come out as lines
 * with tab-separated cells; other lines are split on 2+ spaces.
 */
export async function readDoc(file: Uint8Array, score: HeaderScore): Promise<MasterTable> {
  let body: string;
  try {
    const doc = await new WordExtractor().extract(Buffer.from(file));
    body = doc.getBody();
  } catch {
    throw new MasterReadError("badFile");
  }
  const lines = body.split(/\r?\n/);
  const grid = lines.map((l) =>
    l.includes("\t") ? l.replace(/\t$/, "").split("\t") : l.trim().split(/\s{2,}/),
  );
  const table = gridToTable(grid, score);
  if (score(table.headers) > 0) return table;
  return keyValueTable(lines.map((l) => l.trim())) ?? table;
}
