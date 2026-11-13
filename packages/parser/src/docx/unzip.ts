/**
 * Minimal, dependency-free ZIP reader (enough for .docx / .xlsx).
 * Supports stored (0) and deflate (8) entries via node:zlib.
 * Runs in the Node.js runtime (Vercel route handlers, scripts, tests).
 */
import { inflateRawSync } from "node:zlib";

export function readZipEntry(buf: Uint8Array, name: string): Uint8Array | null {
  const data = Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength);

  // End Of Central Directory record, searched backwards (max comment 64 KB).
  let eocd = -1;
  for (let i = data.length - 22; i >= Math.max(0, data.length - 65557); i--) {
    if (data.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Not a ZIP file (no end-of-central-directory record)");

  const entries = data.readUInt16LE(eocd + 10);
  let p = data.readUInt32LE(eocd + 16);

  for (let n = 0; n < entries; n++) {
    if (data.readUInt32LE(p) !== 0x02014b50) throw new Error("Corrupt ZIP central directory");
    const method = data.readUInt16LE(p + 10);
    const compSize = data.readUInt32LE(p + 20);
    const nameLen = data.readUInt16LE(p + 28);
    const extraLen = data.readUInt16LE(p + 30);
    const commentLen = data.readUInt16LE(p + 32);
    const localOffset = data.readUInt32LE(p + 42);
    const entryName = data.toString("utf8", p + 46, p + 46 + nameLen);

    if (entryName === name) {
      const lNameLen = data.readUInt16LE(localOffset + 26);
      const lExtraLen = data.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + lNameLen + lExtraLen;
      const raw = data.subarray(start, start + compSize);
      if (method === 0) return new Uint8Array(raw);
      if (method === 8) return new Uint8Array(inflateRawSync(raw));
      throw new Error(`Unsupported ZIP compression method ${method}`);
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}
