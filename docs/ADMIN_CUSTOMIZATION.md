# Admin customisation — what is dynamic

Rule for the whole codebase: **if a value could differ between semesters or departments, it comes from the database, not from code.** Code only holds safe defaults (`packages/core/src/settings/schema.ts`, read with `readSetting()`) used when a value is missing or invalid.

## 1. Structured data (own tables, own admin pages)

| What | Table | Admin page | Area |
|---|---|---|---|
| Semesters, active semester, start / end dates | `semesters` | Settings → Semesters | routine |
| Time slots per semester (start, end, label, order) | `time_slots` | Settings → Semesters → Time slots | routine |
| Batches, sections, lab groups (add, rename, archive, graduate) | `batches`, `sections`, `lab_groups` | Batches | batches |
| Courses | `courses` | Courses | courses |
| Faculty, departments, guest teachers, photos, contact visibility | `faculty`, `departments` | Faculty | faculty |
| Buildings, rooms (number, floor, type, capacity, active) | `buildings`, `rooms` | Rooms | rooms |
| Academic calendar (holiday, exam week, no class, special; ranges; per batch) | `calendar_days` | Calendar | calendar |
| Routine versions, classes, exceptions | `routine_versions`, `class_slots`, `class_exceptions` | Routine | routine |
| Notices | `notices` | Notices | notices |
| CR requests, CR assignments | `cr_requests`, `cr_assignments` | CR requests | cr |
| Users (section, status, faculty link) | `profiles` | Users | users |
| Admins and their areas | `admin_permissions`, `admin_invites` | Admins (main admin only) | — |
| App builds and minimum version | `app_releases` | App releases | releases |
| Issue reports | `issue_reports` | Reports | reports |
| Feature switches | `feature_flags` | Settings → Features | settings |
| Any app text, English or Bangla | `i18n_overrides` | Settings → Texts | settings |

## 2. Settings keys (`app_settings`, edited in Settings)

Each key has a zod schema, a default, a visibility and a list of form fields in `SETTINGS` (`packages/core/src/settings/schema.ts`); the admin form (Admin → Settings) is built from those fields and every save is validated with the schema, so adding a key means adding one entry there (plus its texts in `en` / `bn`) and putting it on a page in `SETTINGS_PAGES`. Defaults are inserted by migration `..._storage_and_defaults.sql`; a test checks every seeded value against its schema. `parser.routine` is edited on Settings → Routine format, which arrives with the routine import.

| Key | Shape (default) | Effect |
|---|---|---|
| `department` | `{code:"NFE", name_en, name_bn, university}` | Names shown in the app and on exports |
| `branding` | `{app_name:"NFE Schedule", logo_path:null, accent_dark:"#3DDC97", accent_light:"#1E7A43"}` | App name, uploaded logo (bucket `branding`), accent colours. App icon itself needs a new build. |
| `auth.signup` | `{domain_mode:"restricted", allowed_domains:["diu.edu.bd"], auto_register:true, google:true, email_otp:false, message_en, message_bn}` | Who can register: `restricted` = only listed domains (and subdomains), `any` = every email; auto registration on / off (off = admin approval); which sign-in buttons show; rejection message |
| `auth.blocked_emails` | `[]` | Emails that may never register (private) |
| `auth.main_admin_email` | `"..."` | Bootstrap main admin (private) |
| `i18n.default_locale` | `"en"` (`"en"` or `"bn"`) | Language for new users and guests. Users who picked a language keep it; the phone's language is not used |
| `week` | `{start_day:0, working_days:[0..5], day_names_en, day_names_bn}` | Week shown in pickers and grids |
| `parser.routine` | `{use_defaults:true}` or full rules | Routine file format (see `ROUTINE_IMPORT.md` §6) |
| `cr.policy` | `{max_per_section:2, applications_open:true, allow_any_section:true, expire_with_semester:true, require_message:false}` | CR rules |
| `guest.access` | `{routine:true, faculty_names:true, rooms:true}` | What visitors see without sign-in |
| `reminders` | `{options_minutes:[10,15,30], default_minutes:15}` | Reminder choices |
| `changed_badge_days` | `7` | How long the "Changed" badge stays |
| `room.floor_rule` | `{mode:"first_digit"}` or `{mode:"manual"}` | How a new room's floor is filled in |
| `notifications.templates` | `{routine_published:{en,bn}, ...}` | Push texts |
| `nav.tabs` | `["home","routine","academics","rooms","menu"]` | Bottom tabs: which and in what order (Home and Menu always kept) |
| `home.cards` | `["next_class","today","exams","deadlines","version_banner"]` | Home cards and order |
| `sync` | `{background_minutes:60, schema_version:1}` | Phone background refresh; bump schema_version to force a full re-download |
| `support` | `{contact_email:null, report_issue_enabled:true}` | Help contact |
| `ota` (optional) | `{force_restart_below:null}` | Force restart after a critical OTA update |

## 3. Feature flags (defaults)

`attendance_tracker`, `notes`, `calendar_export`, `home_widget`, `share_whatsapp`, `empty_rooms`, `extra_courses`, `faculty_quick_alert`, `report_issue`, `guest_view`, `cr_apply`. Each flag has `enabled`, `roles` (guest, student, cr, faculty, admin) and optional `min_app_version`. New features ship behind a flag so the admin decides when students see them.

## 4. How a change reaches users

Admin saves → row updated → `sync_version` bumped → phones get it on the next pull (a push is not sent for settings changes; they arrive on the next app open or background sync). Web clients refetch on focus. No release is needed.

## 5. Guard rails

- Every settings form validates before saving; invalid JSON can't be stored from the UI.
- Settings history: the audit log keeps every previous value; Settings shows "Restore previous value".
- Keys marked private (`is_public = false`) are never sent to phones or guests.
