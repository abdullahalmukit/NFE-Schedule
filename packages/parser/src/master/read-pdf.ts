import type { PDFDocumentProxy } from "pdfjs-dist/legacy/build/pdf.mjs";
import {
  cleanCell,
  MasterReadError,
  MAX_IMPORT_ROWS,
  type HeaderScore,
  type MasterTable,
} from "./table";

interface Chunk {
  x: number;
  end: number;
  text: string;
}
interface Line {
  page: number;
  y: number;
  chunks: Chunk[];
}

/** Text pieces closer than this many font heights belong to the same cell. */
const CELL_GAP_EM = 1;
/** Pieces whose baselines differ by less than this (points) are on one line. */
const LINE_TOLERANCE = 2.5;

/**
 * .pdf with a text layer: text pieces are grouped into lines by y and into
 * cells by x gaps; the line matching the most fields is the header and its
 * cells give the column positions. A line with nothing in the first column
 * continues the row above (text wrapped inside a cell). A PDF without any text
 * is a scan and is rejected.
 */
export async function readPdf(file: Uint8Array, score: HeaderScore): Promise<MasterTable> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = pdfjs.getDocument({
    data: new Uint8Array(file), // pdf.js takes ownership of the buffer
    useSystemFonts: false,
    disableFontFace: true,
    verbosity: 0,
  });
  try {
    return await readLines(await task.promise, score);
  } catch (e) {
    if (e instanceof MasterReadError) throw e;
    throw new MasterReadError("badFile");
  } finally {
    await task.destroy();
  }
}

async function readLines(doc: PDFDocumentProxy, score: HeaderScore): Promise<MasterTable> {
  const lines: Line[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items: { x: number; y: number; w: number; h: number; text: string }[] = [];
    for (const it of content.items) {
      if (!("str" in it) || !it.str.trim()) continue;
      const [, , , d, e, f] = it.transform as number[];
      items.push({ x: e!, y: f!, w: it.width, h: Math.abs(d!) || it.height || 10, text: it.str });
    }
    items.sort((a, b) => b.y - a.y || a.x - b.x);
    const pageLines: (typeof items)[] = [];
    for (const it of items) {
      const last = pageLines[pageLines.length - 1];
      if (last && Math.abs(last[0]!.y - it.y) <= LINE_TOLERANCE) last.push(it);
      else pageLines.push([it]);
    }
    for (const l of pageLines) {
      l.sort((a, b) => a.x - b.x);
      const chunks: Chunk[] = [];
      for (const it of l) {
        const c = chunks[chunks.length - 1];
        if (c && it.x - c.end < it.h * CELL_GAP_EM) {
          c.text += (it.x - c.end > it.h * 0.15 ? " " : "") + it.text;
          c.end = Math.max(c.end, it.x + it.w);
        } else chunks.push({ x: it.x, end: it.x + it.w, text: it.text });
      }
      lines.push({ page: p, y: l[0]!.y, chunks });
    }
  }
  if (!lines.length) throw new MasterReadError("scan");

  let headerAt = 0;
  let best = -1;
  lines.forEach((l, i) => {
    const s = score(l.chunks.map((c) => cleanCell(c.text)));
    if (s > best) {
      best = s;
      headerAt = i;
    }
  });
  const header = lines[headerAt]!;
  const headers = header.chunks.map((c) => cleanCell(c.text));
  const starts = header.chunks.map((c) => c.x);
  const column = (x: number) => {
    // The last column starting at or before x (a few points of slack); else the nearest.
    let col = -1;
    starts.forEach((s, i) => {
      if (s <= x + 4) col = i;
    });
    return col >= 0 ? col : 0;
  };

  const rows: string[][] = [];
  const headerText = headers.join("\u0000");
  for (const line of lines.slice(headerAt + 1)) {
    const cells = headers.map(() => "");
    for (const c of line.chunks) {
      const i = column(c.x);
      cells[i] = cells[i] ? `${cells[i]} ${c.text}` : c.text;
    }
    const clean = cells.map(cleanCell);
    // The header repeated on the next page.
    if (clean.join("\u0000") === headerText) continue;
    const prev = rows[rows.length - 1];
    if (prev && !clean[0]) {
      clean.forEach((v, i) => {
        if (v) prev[i] = prev[i] ? `${prev[i]} ${v}` : v;
      });
      continue;
    }
    rows.push(clean);
  }
  if (rows.length > MAX_IMPORT_ROWS) throw new MasterReadError("tooManyRows");
  return { headers, rows, source: { page: header.page } };
}
