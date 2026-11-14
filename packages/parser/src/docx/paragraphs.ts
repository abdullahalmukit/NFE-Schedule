/**
 * Text of the paragraphs outside tables in a .docx, one string per paragraph
 * (empty paragraphs kept as "", so callers can split on blank lines).
 */
import { readZipEntry } from "./unzip";

const decode = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&amp;/g, "&");

export function extractDocxParagraphs(file: Uint8Array): string[] {
  const xmlBytes = readZipEntry(file, "word/document.xml");
  if (!xmlBytes) throw new Error("Not a Word document: word/document.xml is missing");
  let xml = new TextDecoder("utf-8").decode(xmlBytes);
  // Drop tables, innermost first, so nested tables are removed too.
  for (let before = ""; before !== xml;) {
    before = xml;
    xml = xml.replace(/<w:tbl>(?:(?!<w:tbl>)[\s\S])*?<\/w:tbl>/g, "");
  }
  const out: string[] = [];
  for (const p of xml.matchAll(/<w:p\b[^>]*?(?:\/>|>([\s\S]*?)<\/w:p>)/g)) {
    const body = p[1] ?? "";
    let text = "";
    for (const m of body.matchAll(/<w:t\b[^>]*>([^<]*)<\/w:t>|<w:(br|cr|tab)\b[^>]*\/>/g)) {
      if (m[1] !== undefined) text += decode(m[1]);
      else text += m[2] === "tab" ? "\t" : "\n";
    }
    out.push(...text.split("\n").map((l) => l.trim()));
  }
  return out;
}
