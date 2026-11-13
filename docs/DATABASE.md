# Database

Source of truth: `supabase/migrations/` (cloud project; apply with `supabase db push`). Generate types after every schema change: `supabase gen types typescript --linked > packages/core/src/types/database.ts`.

| Migration | Contents |
|---|---|
| `20261113000001_schema.sql` | Enums, `sync_seq`, all tables, touch triggers |
| `20261113000002_security.sql` | Helper functions, public views, row-level security, guard and audit triggers |
| `20261113000003_functions.sql` | Auth hook, new-user trigger, `choose_section`, CR functions, publish / archive, notification recipients, `notify_on_post`, `sync_pull`, `daily_maintenance` |
| `20261113000004_storage_and_defaults.sql` | Storage buckets and policies, default settings and feature flags, NFE department |

These four files were written ahead of the code and have not yet been run against a database. The first task of the `supabase-schema` branch is to push them to the cloud project, fix anything Postgres rejects, and run the checks in §4.

## 1. Entities

Reference: `departments`, `semesters`, `time_slots`, `batches`, `sections`, `lab_groups`, `courses`, `faculty`, `buildings`, `rooms`, `calendar_days`.
Routine: `routine_versions` (draft / published / archived, effective date, parent), `class_slots`, `class_exceptions`.
People: `profiles` (1:1 with `auth.users`), `section_changes`, `admin_permissions`, `admin_invites`, `cr_requests`, `cr_assignments`.
Communication: `notices`, `academic_events`, `notification_events`, `notification_reads`, `push_tokens`.
Personal: `extra_enrolments`, `attendance_records`, `notes`, `issue_reports`.
System: `app_settings`, `feature_flags`, `i18n_overrides`, `import_runs`, `import_mapping_presets`, `app_releases`, `audit_log`.
Views: `faculty_public` (guests), `faculty_directory` (signed in; contacts filtered), `section_crs`.

Day index everywhere: 0 = Saturday … 6 = Friday.

## 2. Personal routine for a date (RT-1) — `packages/core/src/routine/compute.ts`

Inputs (all from local data): profile (section, lab group), extra enrolments, published versions, class slots, exceptions, calendar days, time slots, week settings.

```
routineFor(date):
  if date's weekday not in week.working_days → []
  cal = calendar day covering date (respecting applies_to batch filter)
  if cal.type in (holiday, no_class, exam_week*) → { off: cal }   (*exam_week shows exams instead)
  v = version in effect on date (latest published with effective_from ≤ date)
  base = slots of v where day = weekday(date) and (
           (section = mySection and (labGroup is null or labGroup = myLabGroup))
        or matches an extra enrolment (same course + section, and lab group if set))
  for each exception on date for those sections:
     cancelled   → mark slot cancelled (still shown, struck through)
     room_change → override room
     rescheduled → move to new_date / new_time_slot (remove here, add on new date)
     makeup      → add a virtual class
  sort by start time; insert free-time gaps between classes
```

The same function runs on the web, the phone, the Home widget and the reminder scheduler. It has unit tests built from the Fall 2026 fixture (e.g. 263-A Lab A1 on a Wednesday = 0531-1104 A1 at 08:20 and 0511-1105 at 14:40, with A2's 09:50 session hidden — mockup 3).

## 3. Version in effect

`version_in_effect(semester, date)` in SQL and `versionInEffect()` in `packages/core` must agree: the published version of the semester with the latest `effective_from ≤ date`. Publishing a version dated in the future leaves the current one live until that date; the daily job archives superseded versions.

## 4. Checks after the first push

- `select public.sync_pull(0);` as anon returns public tables only (no profiles, no attendance).
- A student cannot `update profiles set account_type = 'faculty'` on themselves.
- Sign-up rule: with `domain_mode = restricted` a gmail.com sign-up is refused and a diu.edu.bd one accepted; with `any` both are accepted; an invited faculty email is accepted in both modes.
- With `auto_register = false` a new account is `pending`, cannot read notices or post, and becomes active after `review_signup`.
- A CR of 263-A can insert a `class_exceptions` row for 263-A and not for 263-B.
- `apply_for_cr` works for a section other than one's own; `review_cr_request` refuses approval above the limit.
- Importing the fixture creates 55 sections, 578 `class_slots`, 138 with a lab group.
- Supabase Dashboard → Advisors: no "RLS disabled" errors. The two definer views are intentional (they expose a column subset); note them in the advisor.
