/**
 * Extract every table from a .docx as rows of cells; each cell is a list of
 * text lines. A new paragraph and a <w:br/> both start a new line (the
 * Fall 2026 routine uses soft line breaks inside one paragraph).
 * Horizontal merges keep their gridSpan; vertical-merge continuation cells
 * are flagged so the caller can warn about them.
 */
import { readZipEntry } from "./unzip";

export interface DocxCell {
  lines: string[];
  span: number;
  vMergeContinue: boolean;
}
export interface DocxTable {
  index: number;
  rows: DocxCell[][];
}

const TOKEN = /<(\/?)(w:[A-Za-z]+)\b([^>]*?)(\/?)>|<[^>]+>|([^<]+)/g;

function decode(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, "&");
}

interface Ctx {
  table: DocxTable;
  row: DocxCell[] | null;
  cell: DocxCell | null;
  para: string | null;
}

export function extractDocxTables(file: Uint8Array): DocxTable[] {
  const xmlBytes = readZipEntry(file, "word/document.xml");
  if (!xmlBytes) throw new Error("Not a Word document: word/document.xml is missing");
  const xml = new TextDecoder("utf-8").decode(xmlBytes);

  const tables: DocxTable[] = [];
  const stack: Ctx[] = [];
  let inText = false;

  for (const m of xml.matchAll(TOKEN)) {
    const [, close, tag, attrs = "", selfClose, text] = m;
    const ctx = stack[stack.length - 1];

    if (text !== undefined) {
      if (inText && ctx && ctx.para !== null) ctx.para += decode(text);
      continue;
    }
    if (!tag) continue; // a non-w: tag

    const opening = !close && !selfClose;

    if (tag === "w:tbl") {
      if (opening) {
        const table: DocxTable = { index: tables.length, rows: [] };
        tables.push(table);
        stack.push({ table, row: null, cell: null, para: null });
      } else if (close) {
        stack.pop();
      }
      continue;
    }
    if (!ctx) continue; // text outside tables is ignored

    switch (tag) {
      case "w:tr":
        if (opening) {
          ctx.row = [];
          ctx.table.rows.push(ctx.row);
        } else if (close) ctx.row = null;
        break;
      case "w:tc":
        if (opening) {
          ctx.cell = { lines: [], span: 1, vMergeContinue: false };
          ctx.row?.push(ctx.cell);
        } else if (close) ctx.cell = null;
        break;
      case "w:gridSpan": {
        const v = /w:val="(\d+)"/.exec(attrs);
        if (ctx.cell && v) ctx.cell.span = Number(v[1]);
        break;
      }
      case "w:vMerge":
        if (ctx.cell && !/w:val="restart"/.test(attrs)) ctx.cell.vMergeContinue = true;
        break;
      case "w:p":
        if (!ctx.cell) break;
        if (opening) ctx.para = "";
        else {
          if (ctx.para !== null) pushLines(ctx.cell, ctx.para);
          ctx.para = null;
        }
        break;
      case "w:br":
      case "w:cr":
        if (ctx.para !== null) ctx.para += "\n";
        break;
      case "w:tab":
        if (ctx.para !== null) ctx.para += " ";
        break;
      case "w:t":
        inText = opening;
        break;
    }
  }
  return tables;
}

function pushLines(cell: DocxCell, para: string): void {
  for (const l of para.split("\n")) {
    const t = l.replace(/\s+/g, " ").trim();
    if (t) cell.lines.push(t);
  }
}
