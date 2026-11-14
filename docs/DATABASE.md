# Database

Source of truth: `supabase/migrations/` (cloud project only). Commands (root `package.json`; Supabase CLI 3 targets a local stack unless `--remote` is given, so the scripts always pass it):

| Script | Does |
|---|---|
| `pnpm db:push:dry` | `supabase db push --remote --dry-run`: list migrations that would be applied |
| `pnpm db:push` | `supabase db push --remote` |
| `pnpm db:types` | regenerate `packages/core/src/types/database.ts` (run after every schema change) |
| `pnpm db:test` | run the checks in `supabase/tests/` (§4) |
| `pnpm db:advisors` | Supabase security and performance advisors (§5) |

| Migration | Contents |
|---|---|
| `20261113000001_schema.sql` | Enums, `sync_seq`, all tables, touch triggers |
| `20261113000002_security.sql` | Helper functions, public views, row-level security, guard and audit triggers |
| `20261113000003_functions.sql` | Auth hook, new-user trigger, `choose_section`, CR functions, publish / archive, notification recipients, `notify_on_post`, `sync_pull`, `daily_maintenance` |
| `20261113000004_storage_and_defaults.sql` | Storage buckets and policies, default settings and feature flags, NFE department |
| `20261115000001_admin_management.sql` | Main-admin-only `invite_admin`, `set_admin_areas`, `revoke_admin`, `cancel_admin_invite`, `transfer_main_admin` (AUTH-4, AUTH-5); `admin_dashboard()` counts for A-0 |
| `20261115000002_claim_main_admin.sql` | `claim_main_admin()`: the account matching `auth.main_admin_email` takes the main role when none exists (email set after sign-up) |
| `20261114000001_lock_down_functions.sql` | `signup_settings()` (holds the private blocked-email list) no longer callable by anon / signed-in users; trigger functions not callable directly; fixed `search_path` on four functions |

All migrations above are applied to the cloud project. Never edit an applied migration; add a new one.

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

## 4. Database checks (`supabase/tests/`)

`pnpm db:test` runs every `NN-*.sql` file against the cloud project. Each file runs in its own transaction: `_setup.sql` creates test users (directly in `auth.users`, so the new-user trigger runs), a test semester, batch T263 with sections A and B, and `pg_temp` helpers to act as a guest or as a signed-in user; the check records results; the transaction always ends in `ROLLBACK`, so no test user or row is kept.

| File | Checks |
|---|---|
| `01-sync-pull.sql` | `sync_pull(0)` as anon: runs, no `me`, no profiles, no attendance / notes / extra courses, private settings hidden, public data visible; as a student: own profile and only own private rows |
| `02-profile-guard.sql` | A student cannot change own account type, status or email, nor another profile; can change own language |
| `03-signup-rule.sql` | `hook_before_user_created`: restricted refuses gmail.com and look-alike domains, accepts diu.edu.bd and subdomains; any accepts both; invited faculty email accepted and blocked email refused in both modes; admin message returned; only the auth service may call the hook |
| `04-pending-approval.sql` | With `auto_register = false`: new account pending, cannot read notices, post, apply for CR or approve itself; `review_signup` by a users-area admin activates it; invited faculty active at once |
| `05-cr-exceptions.sql` | CR of A can post a class exception for A (and a notification event is created), not for B; a plain student cannot |
| `06-cr-apply-limit.sql` | A student of A can apply for B; approval refused at `max_per_section`; works again below the limit |
| `07-function-privileges.sql` | `signup_settings()` not callable by anon / signed-in users; helper functions have a fixed `search_path` |
| `09-admin-management.sql` | Invite existing account (granted at once) or new email (applied at first sign-in); area / email validation; area changes and revoke take effect at once; only the main admin manages admins; dashboard counts for admins only; admin changes audited with the actor; handover; `claim_main_admin` |
| `08-account-roles.sql` | Main admin by email only while none exists (AUTH-3); faculty email → linked faculty account, students cannot link themselves, users-area admin links / unlinks (AUTH-6); admin-invite and CR-email accounts active at once with auto registration off, others pending (AUTH-8) |

Still to check: importing the Fall 2026 fixture creates 55 sections, 578 `class_slots`, 138 with a lab group — runs once the import exists (`routine-import`, Gate 2).

Not checkable from SQL: the "Before User Created" hook must be switched on in Supabase Dashboard → Authentication → Hooks (`public.hook_before_user_created`).

## 5. Advisors (Supabase Dashboard → Advisors, or `pnpm db:advisors`)

No "RLS disabled" findings. Known, intentional findings:

- **Security definer view** (`faculty_public`, `faculty_directory`, `section_crs`): intentional. They run with the owner's rights to expose a column subset of a protected table: `faculty_public` (guests: initials, names, designations), `faculty_directory` (signed-in members: plus the contacts each teacher chose to show), `section_crs` (signed-in members: CR names per section, no emails; needed for "Your CRs for 263-A").
- **Security definer function executable by anon / authenticated**: intentional. They are either RLS helpers that policies call as the current user (`has_admin_area`, `is_active_member`, `is_cr_of`, ...) or RPCs the apps call (`apply_for_cr`, `choose_section`, `review_*`, `publish_routine_version`, ...), each checking the caller itself. `rls_auto_enable()` is Supabase's own function, not ours.
- **Extension in public** (`citext`): left as is; moving it would touch every citext column.
- Performance (`auth_rls_initplan`, `multiple_permissive_policies`, `unindexed_foreign_keys`, `unused_index`): not an issue at this data size (a few thousand rows); revisit after the pilot.
