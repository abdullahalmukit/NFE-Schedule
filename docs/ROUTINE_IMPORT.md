# Routine import and manual editing

## 1. File format (Fall 2026, Version 5 — verified)

- 55 tables, one per batch-section. Title cell: `263-A`.
- Header: `8:20-09:50 | 09:50-11:20 | 11:20-12:50 | 01:10-02:40 | 02:40-04:10 | 04:10-05:40`. Hours below 8 are afternoon, so slots are stored as 08:20, 09:50, 11:20, 13:10, 14:40, 16:10 (24 h).
- Rows: Saturday … Friday (day index 0 = Saturday). Friday has no classes; Thursday is light.
- Class cell: three lines separated by **soft line breaks inside one paragraph** (`<w:br/>`), not three paragraphs. A reader that only splits on paragraphs sees one line — the reason the project uses its own reader.
- No merged cells in this file; merged cells are still supported (`span`).

| Line | Pattern (default rule) | Examples |
|---|---|---|
| course | `^(?:(?<prefix>[A-Z]{2,5})\s+)?(?<code>\d{4}-\d{3,4})-(?<label>[A-Z])(?<group>\d)?$` | `0531-1103-A`, `0531-1104-A1`, `AOL 0223-111-B`, `EMP 0031-411-C` |
| faculty | `^(?<initial>[A-Z]{1,6})(?:\s*\((?<dept>[A-Z]{2,6})\))?$` | `DAMR`, `NI(ITM)` |
| room | `^(?<building>[A-Za-z][A-Za-z0-9-]*)\s*:\s*(?<room>[A-Za-z0-9-]+)$` | `AB-1: 304`, `AB: 101`, `Gym: 407` |

Code: `packages/parser/src/routine/` — `rules.ts` (defaults and types), `parse-routine.ts`, `clashes.ts`, `diff.ts`. Test: `packages/parser/test/routine-fall-2026-v5.test.ts` (Vitest).

## 2. Known data in Fall 2026 V5

Two independent parsers (the TypeScript one in this repo and a separate python-docx script) agree on all 578 records; the expected output is `fixtures/routine-fall-2026-v5.expected.json`.

| Measure | Value |
|---|---|
| Section tables | 55 (263: 6, 262: 9, 261: 3, 253: 7, 252: 5, 251: 6, 243: 8, 241: 5, 232: 6) |
| Class cells | 578 |
| Lab group sessions | 138 |
| Course codes | 48 (prefixes seen: AOL, EMP) |
| Faculty initials | 79 (78 NFE + NI of ITM) |
| Rooms | 26 in 4 buildings (AB, AB-1, AB-2, AB-3) + Gym |
| Teacher / room clashes | 0 |

**Six cross-section labels** (warnings, not errors):

| Table | Day, time | Cell line 1 | Note |
|---|---|---|---|
| 261-B | Sat 09:50, Sat 11:20 | `0511-1206-D1`, `-D2` | 261 has only sections A–C; lab groups of 261-B are written D1/D2 |
| 261-B | Thu 11:20, Thu 13:10 | `0511-1208-D1`, `-D2` | same |
| 253-C | Mon 13:10, Tue 08:20 | `AOL 0223-111-D` | 253-D has the same course at other times |

Handling: the class belongs to the **table's** section (261-B, 253-C). `section_label` keeps the letter as written. For lab groups the review screen offers per section: *Keep as written (D1, D2)* or *Rename to B1, B2*; the choice is stored in `import_runs.result.overrides` and also saved as a rename rule for later imports of the same semester. Students always choose lab groups from what exists after this step.

## 3. Validation and suggestions on import

Errors (block publishing until fixed in the review screen or the source file): bad title, bad header, bad day, wrong line count, unrecognised course / faculty / room line, duplicate table, teacher / room / section clash.

Warnings (admin accepts or corrects): cross-section label, merged cell, time slots differing between tables.

Resolution against the database (step 2 in `ARCHITECTURE.md` §3.1):

| Found in file | Shown as |
|---|---|
| Course code not in `courses` | "Course codes without titles" — title, credit, type (type pre-detected: any lab-group cell → lab) |
| Initial (+dept) not in active `faculty` | "Faculty initials without details" — full name, designation; classes / week shown |
| Initial of a faculty member marked `left` | Suggestion: re-activate, or create a new teacher with the same initial |
| Active faculty with no class this semester | Suggestion: mark on leave / left |
| New batch-section titles | "Batches in this file" with **New** tag; created on apply after confirmation |
| Active batch with no table | **Graduating** tag; on confirm: batch `graduated`, its students `alumni` |
| Building / room not in `rooms` | Created on apply; floor from `room.floor_rule`, type `lab` if only lab cells use it (editable) |
| Time slots differ from the semester's | Suggestion to update the semester's time slots |

### Review screen as built (`/admin/routine/import`, routine-import)

- **Upload**: semester (active one preselected), version label (unique per semester), .docx. **Read tables** happens at once; the review opens at `?run=<id>` and can be left and continued from the Routine page.
- **Stats** as mockup 8; **Checks** (teacher / room double-booked, unreadable cells, rooms found).
- **Faculty initials without details** / **Course codes without titles**: initials without a teacher record or without a name, codes without a course or without a title; *New* marks the ones that do not exist yet. Names, designations, titles and credits typed here are saved to master data at once (faculty / courses area); "Import from a file" opens the faculty / course import. Records still missing are created bare (initial + department, code + detected type) when the draft is saved.
- **Batches in this file** with *New* and *Graduating*. A graduating batch gets "Mark graduated when published"; the choice is kept in `result.overrides.graduate` and carried out by the publish step (`routine-publish`), never on import.
- **Warnings**: cross-section lab groups are decided per table (*Keep as written* / *Rename*); other warnings are accepted one by one. **Problems** (errors) must be fixed in the file and uploaded again.
- **Class times**: created for a semester without times; when they differ, the admin keeps the semester's or takes the file's.
- **Semester changes** (ADM-RT-10): left teacher appearing again, teacher without classes, guest teacher, new batch, batch without a table. Nothing is applied silently.
- **Save as draft** is enabled when nothing blocks it (problems, undecided warnings, undecided class times). It writes a draft version (`apply_routine_import`); students see nothing until it is published. A draft can be discarded on the Routine page.

## 4. Diff and publish

`diffRoutines(before, after)` (in `diff.ts`) groups classes by section + course + label + lab group and reports `changed` (same time, different teacher or room), `moved`, `added`, `removed`, plus `affected` keys (`263-B` or `263-B/B2`). The preview lists changes per section in plain words, e.g. "263-B · 0711-1101 moved: Tuesday 11:20 → Tuesday 02:40". Publish options: effective date (default today), notify on/off, summary text (prefilled from the count of changes).

As built (`routine-publish`):

- **Version page** `/admin/routine/versions/<id>`: any version read-only, batch tabs and section chips, the section as a days × slots grid like the department's file. A draft links to its publish page.
- **Publish page** `/admin/routine/versions/<id>/publish` (A-3): the draft against the version in effect today (`rtp.*` texts), counts of added / removed / moved / changed, the number of students that will be notified (`count_affected_students`, the routine admin never sees the profiles), effective date (today or later; until then students keep the current version), notify switch (off = silent fix), message, and the batches marked "graduated when published" on the import review. The server works the diff out again and calls `publish_routine_version(…, p_graduate)`: the version is published, versions no longer in effect are archived, the chosen batches become `graduated` and their students `alumni`, and one `routine_published` event targets only the affected sections / lab groups. The first publish of a semester lists no changes, only the class count.
- **Routine page** (A-1): versions with status, source, created, published and effective dates; open any version; compare any two (`/admin/routine/compare?a=&b=`); **Restore as** a new label (`copy_version_to_draft(…, 'rollback')` → a draft copy, then its publish page). One draft per semester.

## 5. Manual editor (ADM-RT-5)

- Layout matches a department table: one section at a time, days × slots; section picker with search; batch tabs.
- Add: click an empty cell → form with course (searchable, shows title), section label (default = section), lab group (optional; existing or new), teacher (searchable by initial / name), room (searchable, shows free / busy at that time), span.
- Edit / delete: click a class card. Move: drag to another cell (or change day / slot in the form).
- Every change runs `detectClashes` on the whole draft and marks conflicts in red with an explanation ("DAMR also teaches 263-C at this time"). Publishing is blocked while errors remain unless the admin ticks "Publish anyway" (logged).
- Drafts: the first edit creates version `N.1` (copy of the version in effect, `source = manual`, `parent_version_id`). Further edits go to the same draft until it is published or discarded. Only one draft per semester at a time.
- "Silent fix": publish with notify off (for spelling or room-number typos).
- Rollback: Version history → pick a version → "Restore" creates a new draft copied from it (`source = rollback`) and opens the publish dialog.
- Admin can also add sections / lab groups here and edit the semester's time slots (warning if classes use a slot being removed).

## 6. Format rules editable by the admin (ADM-RT-11)

`app_settings.parser.routine` holds either `{"use_defaults": true}` or a full `RoutineParserRules` object (see `rules.ts`): patterns for title, course, faculty, room and time header, the afternoon cut-off hour, day names (English and Bangla can both be listed) and line order. The settings page shows each pattern with plain-language help and a **Test** button that parses an uploaded sample with the edited rules and shows stats and the first errors, without saving anything.

## 7. PDF routine (later)

Out of scope for the first release (proposal 6.3). The same `ParsedRoutine` output type is the contract a future PDF reader must produce, so review, diff and publish need no change.
