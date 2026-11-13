/**
 * Runs the database checks (docs/DATABASE.md §4) against the linked cloud project:
 *   pnpm db:test            all checks
 *   pnpm db:test 03         only files starting with "03"
 * Each check file runs in its own transaction that always ends in ROLLBACK,
 * so no test user or test row is ever kept.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

interface Row {
  n: number;
  check_name: string;
  ok: boolean;
  detail: string;
}

const dir = fileURLToPath(new URL(".", import.meta.url));
const filter = process.argv[2] ?? "";
const setup = readFileSync(join(dir, "_setup.sql"), "utf8");
const files = readdirSync(dir)
  .filter((f) => /^\d\d-.*\.sql$/.test(f) && f.startsWith(filter))
  .sort();

const tmp = mkdtempSync(join(tmpdir(), "nfe-db-test-"));
let failed = 0;

for (const file of files) {
  const sql = [
    "begin;",
    setup,
    readFileSync(join(dir, file), "utf8"),
    "select n, check_name, ok, detail from _r order by n;",
    "rollback;",
  ].join("\n");
  const path = join(tmp, file);
  writeFileSync(path, sql);

  let rows: Row[];
  try {
    const out = execFileSync(
      "pnpm",
      ["exec", "supabase", "db", "query", "--remote", "--yes", "-o", "json", "-f", path],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], shell: process.platform === "win32" },
    );
    const json = JSON.parse(out.slice(out.indexOf("{"))) as { rows?: Row[] } | Row[];
    rows = Array.isArray(json) ? json : (json.rows ?? []);
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; message: string };
    rows = [
      {
        n: 0,
        check_name: "script ran",
        ok: false,
        detail: (err.stderr || err.stdout || err.message).trim(),
      },
    ];
  }

  console.log(`\n${file}`);
  if (rows.length === 0) rows = [{ n: 0, check_name: "produced results", ok: false, detail: "" }];
  for (const r of rows) {
    if (!r.ok) failed++;
    console.log(`  ${r.ok ? "PASS" : "FAIL"}  ${r.check_name}${r.detail ? `  — ${r.detail}` : ""}`);
  }
}

rmSync(tmp, { recursive: true, force: true });
console.log(failed ? `\n${failed} check(s) failed` : "\nall checks passed");
process.exit(failed ? 1 : 0);
