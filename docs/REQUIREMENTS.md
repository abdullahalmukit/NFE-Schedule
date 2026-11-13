# Requirements

Numbered requirements built from `docs/PROPOSAL.md` (Sections 1–17 and Addendum A). Every feature branch names the IDs it delivers. "Admin" always means an admin who holds the matching permission area; "main admin" is the project lead.

Priority: **P0** pilot blocker, **P1** needed for full launch, **P2** convenience that can follow.

## 1. Accounts and roles

| ID | Requirement | P |
|---|---|---|
| AUTH-1 | Sign in with Google. **The first sign-in registers the account automatically** (no separate sign-up form). Who may register is set by the admin in Settings → Sign-in (`app_settings.auth.signup`): **restricted** to the domains the admin lists (default `diu.edu.bd`, subdomains included; admin can add, remove or change domains) or **any email address**. Enforced server-side by the Supabase "Before User Created" hook. | P0 |
| AUTH-8 | Admin chooses **auto registration on** (new accounts are active at once) or **off** (new accounts are `pending`; they see a "Waiting for approval" screen with guest access until an admin approves or rejects them in Users → Pending). Invited people — admin invites, CR emails, faculty emails, the main admin — are always active at once and always allowed, whatever the domain rule. | P0 |
| AUTH-9 | Sign-in methods switchable by the admin: Google (default on) and email one-time code (default off) for addresses without Google. Blocked-email list (private) for addresses that may never register. The rejection message is admin-editable in Bangla and English. | P1 |
| AUTH-2 | Guests (not signed in) can open the app and view any section's routine, course titles, room list and faculty names. Faculty contacts, notices, academics and personal features need sign-in. | P0 |
| AUTH-3 | First sign-in with `app_settings.auth.main_admin_email` becomes main admin (only if none exists). | P0 |
| AUTH-4 | Main admin invites admins by email and ticks permission areas: routine, courses, faculty, batches, rooms, notices, cr, calendar, settings, releases, users, reports. Access can be changed or removed instantly. | P0 |
| AUTH-5 | Main admin role can be transferred to another user (handover). | P1 |
| AUTH-6 | A signed-up user whose email matches an active faculty record becomes a faculty account linked to that record; admin can link or unlink manually. | P1 |
| AUTH-7 | Graduated batches' students become read-only alumni. | P1 |

## 2. Onboarding

| ID | Requirement | P |
|---|---|---|
| ONB-1 | After sign-in: choose batch → section → lab group from tappable chips built from the published routine (see screen 1 in the mockups). Nothing is typed. | P0 |
| ONB-2 | "Batch not listed yet?" lets a student finish sign-up; they are notified when their batch's routine is published (`profiles.awaiting_routine`). | P1 |
| ONB-3 | Section and lab group can be changed later from Menu; every change is logged (`section_changes`). | P0 |

## 3. Routine (student view)

| ID | Requirement | P |
|---|---|---|
| RT-1 | Personal routine = class slots of the version in effect for the date, for the student's section (theory, i.e. no lab group) + own lab group (lab), + extra enrolments, adjusted by class exceptions on that date, hidden on holiday / no-class calendar days. Same pure function on web and phone (`packages/core`). | P0 |
| RT-2 | Daily view with date strip, class cards (time, course title + code, type, teacher initial chip, room chip, lab-group badge), free-time gaps with duration, note when another lab group's session is hidden. | P0 |
| RT-3 | Weekly view (grid of days × slots). | P0 |
| RT-4 | View any other section's routine ("Change section" / tap a section badge) without changing one's own. | P0 |
| RT-5 | Search by teacher, course or room. | P1 |
| RT-6 | Live class highlight with time left; next class countdown. | P1 |
| RT-7 | "Changed" badge on classes that moved or changed in the newest version, for `changed_badge_days` days. | P1 |
| RT-8 | Version and effective date shown; "Routine Version N is live — see what changed for 263-A" banner opens the diff for that section. | P0 |
| RT-9 | Download routine as image or PDF; share to WhatsApp as image. | P2 |
| RT-10 | Swipe left/right between days. | P1 |
| RT-11 | Every initial, course code, room and section badge is tappable (Section 5.5 of the proposal). | P0 |

## 4. Home

| ID | Requirement | P |
|---|---|---|
| HOME-1 | Greeting with name and "NFE · 263-A · Lab A1"; "No classes today" state; Next class card; rest of today's (or next day's) classes; upcoming exams and deadlines; version banner; notification bell with unread dot. Cards and their order come from `app_settings.home.cards`. | P0 |

## 5. Academics, notices, notifications

| ID | Requirement | P |
|---|---|---|
| AC-1 | Academics tab: Exams (Quizzes & labs / Mid & final), Deadlines, Notices; each with count badge. | P0 |
| AC-2 | CRs, teachers of the section and admins post quiz, lab exam, mid, final, assignment and presentation dates (date, time or "in class time", room, syllabus, lab group optional). | P0 |
| AC-3 | "Your CRs for 263-A" card with Contact; "Section has no CR? Apply for CR access". | P0 |
| NT-1 | Notices: department (admin), batch (admin), section / lab group / course (CR of that section, teacher of that section, admin). Pinned notices first. | P0 |
| NT-2 | Push notifications are targeted: a change to 263-B lab group B2 reaches only B2 students (and retake students enrolled in those classes, and teachers of that section for section notices). | P0 |
| NT-3 | In-app notification list with read state. | P1 |
| NT-4 | Optional local class reminder 10 / 15 / 30 minutes before each class (choices from settings); works offline. | P1 |

## 6. Class Representatives

| ID | Requirement | P |
|---|---|---|
| CR-1 | **Any student can apply as CR for any batch-section** (picker: batch → section), with optional message and phone. Entry points: Academics tab link and Menu → "Apply as CR". A student sees their own pending / approved / rejected requests and can withdraw a pending one. | P0 |
| CR-2 | Admin "CR requests" page: list with applicant name, email, own section, requested section (flag when different), current CR count of that section, message; Approve / Reject with note. Approval is refused with a clear message when the section is at `cr.policy.max_per_section`. | P0 |
| CR-3 | **Admin assigns a CR manually**: choose section, then search an existing user or type an email (role attaches on that person's first sign-in). | P0 |
| CR-4 | Admin revokes a CR; CR list per section; CR terms end with the semester when `cr.policy.expire_with_semester` is true. | P0 |
| CR-5 | CR can: post section notices, academic events, cancel / reschedule / room-change a single class on a date, schedule a makeup class. Only for sections they are CR of. | P0 |
| CR-6 | `cr.policy.applications_open` and `allow_any_section` switch the feature; `feature_flags.cr_apply` hides it entirely. | P1 |

## 7. Faculty

| ID | Requirement | P |
|---|---|---|
| FAC-1 | Teacher detail screen (mockup 4): initial avatar or photo, full name, designation, department, Call / Email, office room, consultation hours, "Teaches you" card, this week's classes grouped by day with count. | P0 |
| FAC-2 | Faculty directory with search. Contact fields obey each teacher's `contact_visibility`. | P0 |
| FAC-3 | Faculty account: own weekly teaching routine, notices to own sections, quick alert "Class cancelled" / "Running 15 min late" in one tap, edit own contacts and consultation hours. | P1 |

## 8. Rooms

| ID | Requirement | P |
|---|---|---|
| RM-1 | Empty room finder (mockup 6): search, day chips, slot dropdown, "N of M rooms" count, room cards with building, number, Lab badge; list or table view. | P1 |
| RM-2 | Room detail: building, number, floor, type, today's schedule and free slots. | P1 |

## 9. Personal tools

| ID | Requirement | P |
|---|---|---|
| ME-1 | Extra (retake / improvement) courses: pick course, then the section (and lab group) offering it; those classes join the routine. | P0 |
| ME-2 | Attendance tracker: mark attended / missed per class per date; per-course percentage. Private to the student — not readable by admins (RLS). | P1 |
| ME-3 | Notes per course. Private. | P2 |
| ME-4 | Calendar export (.ics file and Google Calendar). | P2 |
| ME-5 | Android home-screen widget showing next class. | P2 |
| ME-6 | Report wrong information on any class (wrong room / time / teacher / missing class / other). | P1 |
| ME-7 | Bangla and English for every screen; default English; Bangla from Settings. The phone's language is not used. The choice is saved in `profiles.locale` when signed in and on the device (`kv`) for guests. Default for new users and guests: `app_settings.i18n.default_locale`. | P0 |
| ME-8 | Dark and light theme; follow system by default. | P0 |

## 10. Admin — routine

| ID | Requirement | P |
|---|---|---|
| ADM-RT-1 | Upload routine .docx with semester and version label; stepper Upload → Read tables → Fill missing details → Publish (mockup 8). | P0 |
| ADM-RT-2 | Review screen: stats (tables, classes, lab sessions, clashes), "Faculty initials without details" and "Course codes without titles" tables editable inline or via template upload, "Batches in this file" with New / Graduating tags, Checks panel (teacher double-booked, room double-booked, unreadable cells, rooms found), warnings list (e.g. cross-section labels) with Accept / Edit per row. | P0 |
| ADM-RT-3 | Change preview against the version in effect: added / removed / moved / changed, grouped by section, e.g. "263-B: Tuesday 11:20 class moved to 02:40". | P0 |
| ADM-RT-4 | Publish with effective date (today or future), notify toggle, optional summary text. Only affected sections / lab groups notified. | P0 |
| ADM-RT-5 | **Manual editor**: section grid identical in shape to the department file; click an empty cell to add a class, click a class to edit (course, section label, lab group, teacher, room, day, slot, span, note), drag to move, delete; add / rename sections and lab groups; live clash marks. Edits go to a draft version ("5.1", parent 5); publish follows ADM-RT-3/4; "silent fix" publishes without notifications. | P0 |
| ADM-RT-6 | Create a routine from scratch in the editor (no file). | P1 |
| ADM-RT-7 | Version history: list, open any version read-only, compare any two, roll back (publishes a copy as a new version). | P1 |
| ADM-RT-8 | Teacher-wise and room-wise routine views; teacher load (classes / week); free rooms by slot. | P1 |
| ADM-RT-9 | Admin posts class exceptions for any section (same form as CR). | P0 |
| ADM-RT-10 | Semester rollover suggestions (proposal 7.1): new batch, graduating batch, new / absent initial, guest teacher, new course — shown on the import review, never applied silently. | P1 |
| ADM-RT-11 | Routine format rules editable (Settings → Routine format) with a "Test on a file" button showing how a sample file parses under the edited rules. | P1 |

## 11. Admin — master data

| ID | Requirement | P |
|---|---|---|
| ADM-MD-1 | Faculty import from CSV, XLSX, JSON, DOCX, DOC, PDF. Course import from the same formats. | P0 |
| ADM-MD-2 | Import wizard: upload → column matching (auto-detected from header synonyms, editable, save as preset) → preview (new / update / unchanged / invalid, with reasons) → apply. Upsert by initial (+ department) / course code; only mapped columns are written; empty cells never overwrite existing values unless "Clear empty cells" is ticked. | P0 |
| ADM-MD-3 | Download templates (CSV, XLSX, JSON) pre-filled with every initial / code in the current routine. | P0 |
| ADM-MD-4 | Manual add / edit / archive for faculty, courses, departments, batches, sections, lab groups, buildings, rooms (type, floor, capacity). Nothing is hard-deleted. | P0 |
| ADM-MD-5 | Faculty photo upload; contact visibility switches per teacher. | P1 |

## 12. Admin — settings, notices, users, releases

| ID | Requirement | P |
|---|---|---|
| ADM-SET-1 | Settings pages for every key in `docs/ADMIN_CUSTOMIZATION.md`, validated with a schema per key, saved to `app_settings` / `feature_flags` / `i18n_overrides`. Phones pick changes up on next sync. | P0 |
| ADM-SET-2 | Semesters (one active), time slots per semester, working days, academic calendar (holiday, exam week, no class, special, with ranges). | P0 |
| ADM-NT-1 | Notices page: create department / batch / section notice, pin, expire, delete. | P0 |
| ADM-USR-1 | Users page: search, see section, change section, set alumni / disabled, link faculty. | P1 |
| ADM-ADM-1 | Admins page (main admin only): invite, edit areas, revoke, transfer main role. | P0 |
| ADM-REP-1 | Reports page: issue reports with status open / fixed / dismissed. | P1 |
| ADM-AUD-1 | Audit log viewer (main admin): who, what, when, before / after. | P1 |
| ADM-REL-1 | App releases page: add Android build (upload APK to `app-releases` bucket or store URL), version name / code, minimum supported code, notes (en / bn), mandatory flag. | P0 |

## 13. Sync, offline, updates

| ID | Requirement | P |
|---|---|---|
| SYNC-1 | Phone reads only from local SQLite. Sync = `rpc('sync_pull', {p_since})` returning changed rows (with tombstones) since the last stored `server_version`. | P0 |
| SYNC-2 | Sync triggers: app start, return to foreground, network regained, push received, pull-to-refresh, background task every `sync.background_minutes`. | P0 |
| SYNC-3 | Offline writes for personal data (attendance, notes, extra courses) go to a local outbox and upload in order when online; posting notices / exceptions requires a connection (button disabled offline with a message). | P0 |
| SYNC-4 | "Last updated" time visible on Home and Routine. | P0 |
| SYNC-5 | Web / PWA caches the app shell and last data with a service worker. | P1 |
| UPD-1 | OTA updates via EAS Update on channels `preview` (pilot APK) and `production` (Play Store); runtime version policy `fingerprint`. | P0 |
| UPD-2 | On start and daily, the app compares its build number with `app_releases`: newer → "Update available" sheet; below `min_supported_code` → blocking update screen. | P0 |
| UPD-3 | Same Android package name and signing key for APK and Play Store builds. | P0 |
| UPD-4 | Web shows "New version available — Reload" when a new deployment is detected. | P1 |

## 14. Non-functional

| ID | Requirement |
|---|---|
| NF-1 | All rules enforced by row-level security and security-definer functions in Supabase; UI hiding is never the only guard. |
| NF-2 | Parser and import never write to live tables before the admin confirms. |
| NF-3 | Import of Fall 2026 V5 reproduces the fixture `fixtures/routine-fall-2026-v5.expected.json` exactly (test in `packages/parser/test`). |
| NF-4 | Routine screens open in under 1 s from local data on a mid-range Android phone. |
| NF-5 | Works on Android 8+, iOS 16.4+ (PWA), current Chrome / Safari / Edge. |
| NF-6 | Accessibility: 44 px touch targets, contrast AA in both themes, screen-reader labels on icon buttons. |
| NF-7 | No secrets in the phone or browser bundle except the Supabase anon key; the service-role key lives only in Vercel server env and Edge Functions. |
| NF-8 | Free-tier friendly: daily cron keeps Supabase awake; file uploads go straight from the browser to Supabase Storage (Vercel body limit). |
| NF-9 | Everything an admin does is in the audit log. |
