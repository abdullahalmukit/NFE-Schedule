# Screens

Mockups 1–8 (`design/app-screens-reference.pdf`) are fixed: build them as drawn, with real data in place of the `[placeholders]`. New screens (N-) follow the same components (`DESIGN_SYSTEM.md`). Requirement IDs in brackets.

## Student / CR / faculty app (phone + PWA)

| # | Screen | Content |
|---|---|---|
| N-1 | Welcome / sign-in (Step 1 of 2) | Logo lockup, one line about the app, "Continue with Google" (first sign-in registers automatically; helper text shows the allowed domains when the rule is restricted, e.g. "Use your @diu.edu.bd email"), "Sign in with email code" when enabled, "Browse routine without signing in" (guest), language switch EN / বাংলা. Error state shows the admin's rejection message. [AUTH-1, AUTH-2, AUTH-9] |
| N-17 | Waiting for approval | Shown after sign-in while the account is `pending`: short message, email used, "Browse routines meanwhile" (guest view), "Sign out". Switches to step 2 automatically when approved (push + sync). [AUTH-8] |
| 1 | Choose your class (Step 2 of 2) | As mockup. Batches from active batches, sections of the chosen batch, lab groups of the chosen section; "New student? Batch not listed yet?" card; "Show my routine". [ONB-1, ONB-2] |
| 2 | Home | As mockup. Header avatar + name + "NFE · 263-A · Lab A1", bell with dot; date; "No classes today" / "Today"; Next class card; day list with "Full week"; version banner. Pull to refresh; "Updated … ago". [HOME-1, RT-8, SYNC-4] |
| 3 | Routine — daily | As mockup. Title + "Fall 2026 · Version 5", search and download buttons, Daily / Weekly, date strip, "Showing 263-A · Lab A1 · Change section", class cards, free time, hidden-session note. Holiday state uses calendar title. Exceptions shown on the card (strikethrough + "Cancelled", or "Room changed → AB-1: 502"); makeup classes inserted with a "Makeup" pill. [RT-2, RT-4, RT-7] |
| N-2 | Routine — weekly | Days as rows (Sat–Thu, working days from settings) × slots, compact coloured cells with code and room; tap → class sheet. [RT-3] |
| N-3 | Class sheet | Bottom sheet from any class: course title, code, credit, type, teacher (tap → 4), room (tap → N-9), time, lab group, CR notices and exams for the course, "Mark attended / missed", "Report wrong information". [RT-11, ME-2, ME-6] |
| N-4 | Search | One field; results grouped: Teachers, Courses, Rooms, Sections. [RT-5] |
| 4 | Teacher | As mockup. [FAC-1] |
| N-5 | Course | Title, code, credit, type, teachers by section, this week's sessions for the student. [RT-11] |
| 5 | Academics | As mockup: Exams (Quizzes & labs / Mid & final), Deadlines, Notices; CR card; "Section has no CR? Apply for CR access" (→ N-7). CRs and teachers see a "+" button. [AC-1, AC-3] |
| N-6 | Post (CR / teacher / admin) | Segmented: Notice · Exam / deadline · Class change. Class change: pick date → pick class from that date's routine → Cancel / Reschedule (date, slot) / Room change (free rooms suggested) ; or "Makeup class" (course, date, slot or custom time, room). Faculty quick alert: "Cancelled" / "Running 15 min late" one-tap buttons. Disabled offline. [CR-5, AC-2, NT-1, FAC-3] |
| N-7 | Apply as CR | Batch chips → section chips (defaults to own section; any section allowed), current CRs of that section and the limit, message, phone, Submit. Below: "My requests" with status pills and Withdraw. [CR-1] |
| 6 | Empty rooms | As mockup; table view toggle; tap room → N-9. [RM-1] |
| N-9 | Room | Building, number, floor, type; today's timeline with busy (section, course) and free slots. [RM-2] |
| 7 | Menu | As mockup + rows: "Apply as CR", "My CR sections" (for CRs), "Teaching routine" (faculty), Language, Theme, About & updates. [ME-*] |
| N-10 | Extra courses | List of added courses; Add → course search → sections offering it (with times) → lab group. [ME-1] |
| N-11 | Attendance tracker | Per-course percentage bars; tap → dated list with toggles. [ME-2] |
| N-12 | Notes | List and editor per course. [ME-3] |
| N-13 | Notifications | List with unread dots; tap opens the related screen. [NT-3] |
| N-14 | Settings | Theme, language, reminders (off / 10 / 15 / 30), calendar export, offline data (size, "Re-download"), app version and "Check for updates". [NT-4, ME-4, ME-7, ME-8] |
| N-15 | Update sheet / blocking update | See `APP_UPDATES.md`. [UPD-2] |
| N-16 | What changed | Diff for the user's section between the new and previous version, grouped by day. [RT-8] |

## Admin panel (web, desktop-first, works on tablet)

Top bar: "NFE Schedule **Admin**" · Routine · Courses · Faculty · Batches · Notices · Rooms · CR requests · (more ▾: Calendar, Users, Reports, App releases, Settings, Admins, Audit log) · signed-in name. Links hidden for areas the admin lacks.

| # | Screen | Content |
|---|---|---|
| A-0 | Dashboard | Active semester and version, counts (students signed up per batch, pending CR requests, open reports), quick actions. |
| 8 | Routine import review | As mockup, plus a Warnings panel and a "Preview changes" step before Publish. [ADM-RT-1…4] |
| A-1 | Routine home | Versions list (status, effective date, published by), "Upload new routine", "Edit current routine" (→ A-2), compare, restore. [ADM-RT-7] |
| A-2 | Routine editor | Batch tabs, section picker, grid days × slots, class cards; side panel form; clash list; draft banner "Version 5.1 (draft) — Preview & publish / Discard". [ADM-RT-5, ADM-RT-6] |
| A-3 | Publish dialog | Changes grouped by section, effective date, notify toggle, summary text, affected student count. [ADM-RT-4] |
| A-4 | Teacher and room views | Pick a teacher → week grid + load; pick a room → week grid; free rooms per slot. [ADM-RT-8] |
| A-5 | Class exceptions | Calendar list of exceptions; create for any section. [ADM-RT-9] |
| A-6 | Courses / Faculty | Tables + side form + "Import" (→ A-7) + "Download template". [ADM-MD-3…5] |
| A-7 | Import wizard | Upload → Match columns → Preview → Apply. [ADM-MD-1, ADM-MD-2] |
| A-8 | Batches | Batches with sections and lab groups, graduate / archive, add. |
| A-9 | Rooms | Buildings and rooms, type, floor, capacity. |
| A-10 | CR requests | Tabs: Pending · Approved · Rejected · Current CRs. Request row: applicant, own section, requested section (amber "Other section" pill if different), section's CR count / limit, message, Approve / Reject with note. "Assign CR" button: section picker + user search or email. Current CRs: per section with Revoke. [CR-2, CR-3, CR-4] |
| A-11 | Notices | Create (scope picker), list, pin, delete. [ADM-NT-1] |
| A-12 | Calendar | Month view; add holiday / exam week / no class / special with ranges and batch filter. [ADM-SET-2] |
| A-13 | Users | Tabs: All · **Pending** (count badge; Approve / Reject, bulk approve) · Alumni · Disabled. Search, filters, edit section, status, faculty link. [ADM-USR-1, AUTH-8] |
| A-14 | Reports | Issue reports with links to the class in the editor. [ADM-REP-1] |
| A-15 | App releases | List per platform / channel, Add release (upload APK or store URL, version, minimum, notes, mandatory). [ADM-REL-1] |
| A-16 | Settings | Sub-pages: General (department, branding), Semesters & time slots, Week, Sign-in (domain rule: restricted with domain list editor / any email; auto registration on / off; Google and email-code switches; blocked emails; rejection message), CR rules, Guest access, Home & tabs, Notifications texts, Reminders, Routine format (with Test), Features, Texts (i18n overrides). [ADM-SET-1] |
| A-17 | Admins | Main admin only: invite, areas checkboxes, revoke, transfer main role. [AUTH-4, AUTH-5] |
| A-18 | Audit log | Filterable list; row → before / after JSON diff. [ADM-AUD-1] |

The student pages of the web app are the same screens as the phone, laid out in a centred 480 px column on desktop with the bottom nav, so the PWA looks like the app.
