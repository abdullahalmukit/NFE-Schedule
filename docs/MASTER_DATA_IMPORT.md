# Faculty and course import (ADM-MD-1 … ADM-MD-5)

Admins can fill the faculty list and the course list from **CSV, Excel (.xlsx), JSON, Word (.docx / .doc) or PDF**, and can always add or edit one record by hand.

## 1. Wizard (same for faculty and courses)

Pages: `/admin/faculty/import` and `/admin/courses/import` (opened from "Import from a file" on Faculty / Courses). Steps:

1. **Upload** — drag a file or pick one (at most 10 MB). The browser uploads it straight to the private `imports` bucket at `<runId>/<name>` (`importObjectPath`: the name is kept ASCII, the original goes to `import_runs.file_name`).
2. **Read** — `POST /api/admin/import/master/parse {kind, runId, fileName, sheet?}` creates the `import_runs` row (`kind = faculty | courses`, `file_path` = the bucket path), reads the file into `{ headers, rows, source: {sheet?, page?} }` (at most 5 000 rows), stores it in `import_runs.result.table` (`status = parsed`) and returns the headers, the first rows, the sheets of a workbook, the automatic matching and the saved presets. Choosing another sheet calls it again for the same run. A file that cannot be read sets `status = failed` and shows why (damaged, not valid JSON, no table, scanned PDF, too many rows).
3. **Match columns** — every target field gets a source column, auto-chosen from the synonyms below; the admin can change any match, leave a field out, or pick a saved preset (only the preset's columns this file has are used). "Save as preset" stores the mapping in `import_mapping_presets` (`POST …/presets {kind, name, mapping}`; the same name replaces it). Required fields (initial / code) must have a column.
4. **Preview** — `POST …/preview {kind, runId, mapping, options}` validates each row and compares it with the database:
   - **New** (no record with that key), **Update** (field-by-field old → new), **Unchanged**, **Invalid** (with reasons: missing or bad key, bad email / phone / credit / type / status / guest value, unknown course department, duplicate key in file, text too long). Fully empty rows are left out.
   - Options: "Clear existing values when a cell is empty" (off by default; type, status and guest are never cleared), "Skip invalid rows" (on; when off, any invalid row blocks Apply).
   - Faculty: a department code that does not exist yet is listed and created on Apply. Courses: an unknown offering department makes the row invalid (departments belong to the faculty area).
5. **Apply** — `POST …/apply` (same body) builds the preview again from the stored table, then calls `apply_master_import(run, plan)`: new rows are inserted with every value, updates write only the changed values, all in one transaction, as the admin (security invoker: RLS decides, the audit triggers record each row). The run becomes `applied` with the counts in `result.applied` and cannot be applied twice; if a record changed since the preview, nothing is written and the admin opens the preview again. The summary shows the counts and offers the invalid rows as CSV (original cells + an `error` column) to fix and upload again.

Keys: faculty by `initial` + department among teachers who have not left (a teacher without a department counts as the home department); courses by `code` (archived courses included, since the code is unique).

Nothing reaches the live tables before Apply.

## 2. Target fields and header synonyms

Matching is case-insensitive and ignores spaces, dots, underscores and Bangla/English variants.

**Faculty** (key: `initial` + `department`, department defaults to NFE)

| Field | Required | Synonyms |
|---|---|---|
| initial | yes | initial, short name, short form, code, teacher code, abbreviation, সংক্ষিপ্ত নাম |
| full_name | — | name, full name, teacher name, faculty name, নাম |
| designation | — | designation, position, rank, title, পদবি |
| department | — | department, dept, dept., বিভাগ (code such as ITM; created if new and confirmed) |
| email | — | email, e-mail, mail, ইমেইল |
| phone | — | phone, mobile, contact, cell, ফোন, মোবাইল |
| office_room | — | office, room, office room, chamber |
| consultation_hours | — | consultation, counselling hours, office hours |
| status | — | status (active / on leave / left) |
| is_guest | — | guest, external |

**Courses** (key: `code`)

| Field | Required | Synonyms |
|---|---|---|
| code | yes | code, course code, course no, course number, কোড |
| title | — | title, course title, course name, name, শিরোনাম |
| title_bn | — | bangla title, title (bn) |
| credit | — | credit, credits, cr, ch, credit hour |
| type | — | type, theory/lab, category (values: theory, lab, sessional→lab, practical→lab) |
| offering_department | — | department, offered by, dept |

Normalisation (`packages/core/src/master/normalize.ts`, also used by the manual forms in Admin → Courses / Faculty / Batches / Rooms): initials upper-cased and trimmed; `NI(ITM)` split into initial + department; course codes normalised to `[PREFIX ]dddd-ddd[d]` (a trailing section letter such as `-A` is removed with a warning); emails lower-cased; phone numbers keep digits and a leading `+`; Bangla digits converted.

## 3. Readers (`packages/parser/src/master/`)

| Format | Reader | Notes |
|---|---|---|
| .csv | `papaparse` | Detects delimiter (`,` `;` tab) and UTF-8 BOM. |
| .xlsx / .xls | SheetJS (`xlsx` 0.20.3 from the SheetJS CDN tarball) | The sheet whose header matches best is used; the admin can pick another. |
| .json | built-in | Array of objects, or `{faculty: [...]}` / `{courses: [...]}`. Keys are treated as headers. |
| .docx | `packages/parser/src/docx/tables.ts` | Uses the first table whose header row matches the most synonyms; cell lines joined with a space. Falls back to "Key: Value" paragraphs (one record per blank-line block). |
| .doc | `word-extractor` | Legacy Word has no table XML; text is split into rows by line and into columns by tab or 2+ spaces. Preview always opens. |
| .pdf | `pdfjs-dist` (legacy Node build) | Text items grouped into lines by y position and into cells by x gaps; the header row is detected by synonyms and its cells give the column positions; a line with nothing in the first column continues the row above (text wrapped in a cell); a header repeated on the next page is skipped. Scanned PDFs (no text layer) are rejected with "This PDF is a scan; please upload CSV or Excel". Preview always opens. |

Every reader returns the same `{headers, rows}` shape, so matching, preview and apply are written once. In every format the header row is the one near the top that matches the most fields (titles above the table are fine); columns with an empty header get "Column N". Readers are server only and imported from `@nfe/parser/master`; `pdfjs-dist` and `word-extractor` are loaded at run time (`serverExternalPackages` in `next.config.ts`).

Each reader has a fixture test (`packages/parser/test/master/`). The CSV and JSON tests use the files in `templates/`; the Word, PDF and Excel fixtures are made with Microsoft Word and Excel by `packages/parser/test/master/make-fixtures.ps1` (run it again to change them).

## 4. Templates

`templates/faculty_template.csv` (79 initials, sorted by classes per week) and `templates/courses_template.csv` (48 codes with detected theory / lab type) are pre-filled from the Fall 2026 V5 routine. The admin panel generates fresh templates (CSV, XLSX, JSON) on demand (ADM-MD-3, `GET /api/admin/import/master/template?kind=&format=`): every teacher who has not left / every course that is not archived, with what is already stored filled in, and the class counts and detected type from the routine version in effect of the active semester (empty before the first publish). The CSV starts with a byte order mark so Excel shows Bangla correctly. `classes_per_week`, `detected_type` and `sessions_per_week` columns are informational and ignored on import.

## 5. Manual screens

- Faculty: table with search and filters (status, department, missing details); side panel form; photo upload to `faculty-photos/<id>.jpg` (resized to 512 px on the client); contact visibility switches; "Mark as left / on leave"; "Invite to complete profile" (email link to sign in, which links the account by email).
- Courses: table with search; side panel form; archive.
- Departments, buildings, rooms (type, floor, capacity), batches, sections, lab groups: simple list + form pages.
- Archive instead of delete everywhere; archived rows stay linked to old routine versions.
