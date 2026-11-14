# Faculty and course import (ADM-MD-1 … ADM-MD-5)

Admins can fill the faculty list and the course list from **CSV, Excel (.xlsx), JSON, Word (.docx / .doc) or PDF**, and can always add or edit one record by hand.

## 1. Wizard (same for faculty and courses)

1. **Upload** — drag a file or pick one. Browser uploads to Storage `imports/<runId>/` and creates an `import_runs` row (`kind = faculty | courses`).
2. **Read** — `POST /api/admin/import/master/parse {runId}` turns the file into a table: `{ headers: string[], rows: string[][], source: {sheet?, page?} }`.
3. **Match columns** — every target field gets a source column, auto-chosen from the synonyms below; the admin can change any match, ignore a column, or pick a saved preset. "Save as preset" stores the mapping in `import_mapping_presets`.
4. **Preview** — each row is validated and compared with the database:
   - **New** (no record with that key), **Update** (shows field-by-field old → new), **Unchanged**, **Invalid** (with reason: missing key, bad email, credit not a number, duplicate key in file …).
   - Options: "Clear existing values when a cell is empty" (off by default), "Skip invalid rows" (on).
5. **Apply** — `POST /api/admin/import/master/apply {runId, options}` upserts in one transaction, sets `import_runs.status = applied`, writes the audit log. A summary shows counts and lets the admin download the invalid rows as CSV to fix and re-upload.

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
| .xlsx / .xls | SheetJS (`xlsx` from the SheetJS CDN tarball, current version) | Admin picks the sheet when there are several; first non-empty row = headers. |
| .json | built-in | Array of objects, or `{faculty: [...]}` / `{courses: [...]}`. Keys are treated as headers. |
| .docx | `packages/parser/src/docx/tables.ts` | Uses the first table whose header row matches the most synonyms; cell lines joined with a space. Falls back to "Key: Value" paragraphs (one record per blank-line block). |
| .doc | `word-extractor` | Legacy Word has no table XML; text is split into rows by line and into columns by tab or 2+ spaces. Preview always opens. |
| .pdf | `pdfjs-dist` (legacy Node build) | Text items grouped into lines by y position and into columns by x gaps; header row detected by synonyms. Scanned PDFs (no text layer) are rejected with "This PDF is a scan; please upload CSV or Excel". Preview always opens. |

Every reader returns the same `{headers, rows}` shape, so matching, preview and apply are written once. Each reader has a fixture-based test (`packages/parser/test/master/`), including a PDF and a .doc generated from `templates/`.

## 4. Templates

`templates/faculty_template.csv` (79 initials, sorted by classes per week) and `templates/courses_template.csv` (48 codes with detected theory / lab type) are pre-filled from the Fall 2026 V5 routine. The admin panel generates fresh templates (CSV, XLSX, JSON) from the latest routine on demand (ADM-MD-3). `classes_per_week`, `detected_type` and `sessions_per_week` columns are informational and ignored on import.

## 5. Manual screens

- Faculty: table with search and filters (status, department, missing details); side panel form; photo upload to `faculty-photos/<id>.jpg` (resized to 512 px on the client); contact visibility switches; "Mark as left / on leave"; "Invite to complete profile" (email link to sign in, which links the account by email).
- Courses: table with search; side panel form; archive.
- Departments, buildings, rooms (type, floor, capacity), batches, sections, lab groups: simple list + form pages.
- Archive instead of delete everywhere; archived rows stay linked to old routine versions.
