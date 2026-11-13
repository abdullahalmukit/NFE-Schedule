# NFE Schedule — Project Proposal

A centralized academic routine and information platform for the Department of Nutrition and Food Engineering, Daffodil International University

Nov 7, 2026 · Revised Nov 13, 2026 (Addendum A)

> Sections 1–17 are the approved proposal and are kept unchanged. Addendum A at the end adds the new requirements and records where the technical plan was updated. Where Addendum A says a section is updated, the addendum is the one to follow.

## 1. Executive Summary

NFE Schedule is a web and mobile application that gives every student of the NFE Department a personal, always-current class routine, built directly from the routine document the department already publishes.

Today the department issues one Word or PDF file holding a separate table for each batch and section. The Fall 2026 file (Version 5) alone contains 55 section tables and 578 class entries, of which 138 are laboratory group sessions. Every revision means re-sharing the whole file, and each student must find their own table, filter their lab group and decode course codes and faculty initials by hand.

NFE Schedule removes that manual work. The administrator uploads the same document; the system reads every table, checks it for errors and clashes, and publishes a personalized routine to each student with the full course name, teacher's name and room. Only the students whose classes changed are notified.

| Item | Detail |
|---|---|
| Project name | NFE Schedule |
| Category | Academic management and scheduling platform |
| Institution | Daffodil International University (DIU) |
| Department | Nutrition and Food Engineering (NFE) |
| Platforms | Web application and Android app; iPhone through the installable web app during the pilot, App Store app after approval |
| Access | Online, with offline access to synchronized data |
| Primary users | Students, Class Representatives, Faculty, Department Administrators |
| Routine source | Department-issued routine document (.docx), imported automatically |

## 2. Background and Problem Statement

The NFE routine is accurate but hard to use, because it is designed for the department to publish rather than for a student to read.

Each table in the routine document is titled with a batch and section (for example 263-A) and laid out as days (Saturday to Friday) against six fixed time slots (08:20 to 05:40). Every class cell holds three lines: the course code with section or lab group (0531-1104-A1), the faculty initial (DAMR) and the room (AB-1: 206).

This format creates the following problems:

- **Codes without names.** The routine shows 48 distinct course codes and about 80 faculty initials, but no course titles or teacher names. New students cannot tell what 0711-1101 is or who MHR is.
- **Lab groups mixed into section tables.** A student in group A1 must ignore the A2 sessions in the same table, which causes missed and wrongly attended labs.
- **Frequent revisions.** The current file is already Version 5 of the semester. Each revision is re-shared as a full file, and students cannot see what changed.
- **Retake students.** Students taking a course with another section must combine two or more tables by hand.
- **Scattered announcements.** Class cancellations, makeup classes and notices travel through separate messaging groups and are easily lost.
- **No faculty or room view.** A teacher or administrator cannot quickly see one teacher's weekly load or which rooms are free.

## 3. Objectives

The project aims to make the official NFE routine personal, readable and current for every student, without adding work for the department.

1. Import the department's existing routine document automatically, with no change to how the department prepares it.
2. Show each student only their own classes, filtered by batch, section and lab group, with full course and teacher names.
3. Detect errors and timetable clashes before a routine is published.
4. Keep a version history of every routine and notify only the students affected by a change.
5. Give Class Representatives a structured channel for section announcements, cancellations and makeup classes.
6. Provide teacher-wise and room-wise routine views from the same data.
7. Keep the routine available offline once synchronized.

## 4. Users and Roles

The system has four roles, each with clear limits on what it can view and change.

| Role | Who | Can view | Can manage |
|---|---|---|---|
| Guest | Anyone opening the app without signing in | Any section's class routine | Nothing |
| Student | Any enrolled NFE student | Own routine, faculty directory, department and section notices | Own profile, section, lab group, extra (retake) courses, attendance log |
| Class Representative (CR) | One or two students per section, approved by an admin | Everything a student sees | Section announcements, exam dates, deadlines, class cancellation and makeup notices for their section |
| Faculty | NFE teachers and guest teachers | Own weekly routine, routines of sections they teach | Own profile, consultation hours, notices and quick cancel or late alerts to their sections |
| Admin | Department staff or coordinators given access by the main administrator | All routines, rooms, faculty load, version history | Only the areas the main administrator grants: routine import and editing, courses, faculty, batches, CR approval, notices |
| Main administrator | Project lead | Everything | Everything an admin can, plus granting, limiting and removing admin access, system settings and the audit log |

Students sign up with their DIU email address and select their batch, section and lab group once. The admin verifies CR and faculty accounts.

### 4.1 Administrator access

The project lead is the main administrator and decides who else can manage the system and how much.

- The main administrator invites an admin by DIU email and ticks the areas they may manage (for example, routine import only, or notices and CR approval only).
- Access can be narrowed or removed at any time; the change takes effect immediately.
- Every admin action is recorded in the audit log with the admin's name and time.
- At handover, the main administrator role can be transferred to a person the department names.

### 4.2 Sign-up and choosing a class

Students never type their batch or section; they pick from options built from the published routine, so a wrong entry is not possible.

1. The student signs in with Google, restricted to DIU email addresses.
2. They choose batch, then section, then lab group. Each list shows only what exists in the current routine (for example, 263 has sections A to F, and 263-A has lab groups A1 and A2).
3. Their personal routine appears immediately.

When a new batch joins, its batch, sections and lab groups appear in these lists as soon as the admin confirms the new routine import. A new student who signs up before their batch's routine is published can register now; the app notifies them when the routine is live so they can pick their section. Students can change section or lab group later from settings, and every change is logged.

## 5. Key Features

The core feature is a personal routine; every other feature either keeps it accurate or adds information around it.

### 5.1 For students

- **Personal routine:** today's classes, the full week, and the next class with a countdown. Theory classes for the section and only the student's own lab group are shown.
- **Readable entries:** each class shows course title and code, teacher's full name and initial, room and time.
- **Extra courses:** retake or improvement students add individual classes from other sections to their own routine.
- **Change alerts:** a push notification when a class in their routine moves, is cancelled or has a makeup session.
- **Faculty directory:** name, initial, designation, email, phone, office room and consultation hours.
- **Notices:** department-wide and section-specific announcements in one feed.
- **Personal attendance log:** students mark each class attended or missed and see a per-course attendance percentage.
- **Calendar export:** add the routine to Google Calendar or the phone calendar (.ics).
- **Offline access:** the last synchronized routine, notices and directory work without internet.

### 5.2 For Class Representatives

- Post announcements to their own section only.
- Post quiz, lab exam, mid-term and final exam dates and assignment deadlines, shown in every section member's Academics tab and dashboard.
- Mark a single class on a single date as cancelled, rescheduled or room-changed, without changing the permanent routine.
- Schedule a makeup class, which appears in the routine of every student in the section.

A section without a CR shows a "Get CR access" option; a student applies, and the admin approves the request.

### 5.3 For faculty

- Personal weekly teaching routine across all sections.
- Notices to the sections they teach.
- Profile and consultation hours, shown in the directory.

### 5.4 For department administrators

- Routine import from the department's .docx file, with validation, change preview and versioning (Section 6).
- Grid editor for small changes to one class without re-uploading the file.
- Clash detection for teachers and rooms on every import and edit.
- Teacher-wise and room-wise views, including free rooms by time slot.
- Master data management for courses, faculty, batches, sections and lab groups (Section 7).
- Version history with the option to roll back to an earlier routine version.

### 5.5 Tap any item in the routine for details

Every code, initial and room in the routine is tappable, so a student never needs a separate list to decode it.

| Tap on | Opens | Actions |
|---|---|---|
| Faculty initial (DAMR) | Photo, full name, designation, department, office room, consultation hours | Call, email, see the teacher's full weekly routine, see which of the student's courses they teach |
| Course (0531-1103) | Course title, code, credit, theory or lab, teachers by section | See all this week's sessions, CR notices and exams for the course |
| Room (AB-1: 304) | Building and room, room type (classroom or lab) | See the room's schedule for the day and its free slots |
| Section or lab group badge (263-A, A1) | Section routine and CR names | Switch the routine view to that section |

### 5.6 App screens

The mobile app uses five bottom tabs, a dark and light theme, and one colour per course so the week can be read at a glance.

| Tab | What it shows |
|---|---|
| Home | Today's next classes, upcoming exams, upcoming deadlines, notification bell, quick link to the calendar |
| Routine | Daily and weekly views, a date strip, class cards with time, course, teacher and room, break gaps between classes, the routine version and its effective date, search by teacher, course or room, view any other section's routine, retake course routine, download as image or PDF |
| Academics | Exams (quizzes and labs, mid and final), deadlines and CR announcements, each with a count badge |
| Rooms | Empty room finder by day and time slot, in list or table view, with lab rooms labelled |
| Menu | Profile, notes, CR list, faculty directory, attendance tracker, registered (extra) courses, settings |

### 5.7 Everyday convenience

These features make the app quicker to use than the routine file, which is what will make students keep using it.

| Feature | What it does |
|---|---|
| Home screen widget | Shows the next class, time, room and teacher on the phone's home screen without opening the app |
| Holiday-aware routine | Uses DIU's academic calendar so holidays and exam weeks show "No classes" instead of the normal routine |
| Changed badge | Marks a class moved or changed in a new routine version for one week, so nobody misses it |
| Live class highlight | Highlights the class in progress and shows how long is left |
| Swipe between days | Swipe left or right to move through the week |
| Share to WhatsApp | Sends one's own routine as an image to a group in one tap |
| Guest view | Anyone can view any section's routine without signing in; sign-in is needed only for personal features |
| Room floor | Shows the floor with the room (AB-1: 304, 3rd floor) to help new students |
| Bangla and English | The whole app works in either language |
| Report wrong information | A student can flag a wrong class, room or teacher directly to the admin |
| Quick alert for faculty | A teacher sends "class cancelled" or "running 15 minutes late" to a section in one tap |

## 6. Routine Import from the Department Document

The administrator uploads the department's routine .docx and the system converts every table into structured class records, so the department keeps preparing the routine exactly as it does today.

A test parse of the Fall 2026 Version 5 file confirmed the format is regular enough for full automation: all 55 tables and 578 class cells were read with no exceptions, and no teacher or room clashes were found.

### 6.1 How a table is read

- The top-left cell gives the batch and section (263-A).
- The header row gives the six time slots; the first column gives the day.
- Every non-empty cell is one class, made of three lines.

| Cell line | Example | Stored as |
|---|---|---|
| Line 1 | 0531-1103-A | Course code 0531-1103, section A |
| Line 1 (ending in a digit) | 0531-1104-A1 | Course code 0531-1104, section A, lab group A1 |
| Line 2 | DNU | Faculty initial |
| Line 3 | AB-1: 304 | Building AB-1, room 304 |
| Table position | Sunday, 08:20–09:50 | Day and time slot |

The parser also handles cases found in the current file: course codes with a prefix (AOL 0223-111, EMP 0031-411) and initials carrying another department (NI(ITM)), which is stored as a separate department field.

### 6.2 Import steps

1. **Upload.** The admin uploads the .docx and enters the semester and version (Fall 2026, Version 5).
2. **Parse.** The server reads each table into class records.
3. **Validate.** The system flags unknown course codes, unknown faculty initials, malformed cells, and teacher or room clashes.
4. **Resolve unknowns.** Missing course titles or faculty details are entered on the same screen and saved permanently, so they are not asked for again next semester.
5. **Preview changes.** A comparison with the current version lists every added, removed and moved class (for example, "263-B: Tuesday 11:20 class moved to 02:40").
6. **Publish.** The admin confirms; the new version goes live and only students in changed sections or lab groups are notified.

### 6.3 PDF files

The first release accepts .docx only, because table structure in a Word file is exact while table detection in a PDF is error-prone. The department will be asked to share the .docx version of each routine. PDF import can be added later as an enhancement.

## 7. Master Data: Courses and Faculty

The routine document carries only codes and initials, so the system keeps two permanent reference lists that turn them into names; each is set up once and reused every semester.

| List | Key | Fields | Initial size (Fall 2026) |
|---|---|---|---|
| Courses | Course code (0531-1103) | Title, credit, type (theory or lab), offering department | 48 codes |
| Faculty | Initial (DAMR), unique | Full name, designation, department, email, phone, office room, consultation hours, photo | About 80 initials |

The admin can fill these lists in three ways:

- **Bulk upload** from an Excel or CSV template, pre-filled with every code and initial found in the current routine so only names need typing.
- **Inline during import,** when the validation step finds an unknown code or initial.
- **Manual entry** from the admin panel at any time.

Faculty can later complete their own contact details and consultation hours after the admin links their account to their initial. Guest teachers from other departments, such as NI(ITM), are kept in the same list with their own department recorded.

### 7.1 Handling change every semester

The department changes every four months, when a new batch joins and a senior batch graduates, and faculty join or leave at any time; the system treats each new routine import as the moment to detect and confirm these changes.

Three rules keep this safe:

- **Nothing is deleted.** Batches, faculty and courses are marked inactive or archived, so old routine versions and records stay correct.
- **Identity is not the initial.** Each teacher has an internal ID; the initial is unique only among active faculty, so a reused initial years later points to the new teacher without changing history.
- **The routine file is the signal.** Differences between the new file and the current data are shown to the admin as suggestions, never applied silently.

| Change | How the system detects it | What the admin confirms |
|---|---|---|
| New batch joins (for example 271) | New batch-section titles (271-A, 271-B) appear in the routine file | Create the batch, its sections and lab groups in one step |
| Senior batch graduates | A batch has no classes in the new routine | Mark the batch as graduated; its student accounts move to read-only alumni |
| New faculty member joins | A new initial appears in the routine | Add name, designation and contacts, or send the teacher an invite to complete them |
| Faculty member leaves or is on leave | An active initial appears in no class this semester | Mark as left or on leave; they disappear from the directory but stay in history |
| Guest teacher from another department | Initial with a department tag, such as NI(ITM) | Add as guest faculty with their department |
| New or revised course | A new course code appears | Add title, credit and type |
| CR changes | Start of a new semester | CR roles expire each semester; sections re-apply or the admin reassigns |

Students keep their batch and section for their whole degree, so a new semester needs no action from them: their routine switches to the new version automatically on its effective date.

## 8. System Architecture and Technology Stack

> Updated by Addendum A, section A.4 (Supabase and Vercel replace the separate API server).

All three client apps talk to a single API server, which owns the data, runs the routine import and sends targeted notifications.

The import parser is the core component: it turns the department's file into checked class records that every other part of the system reads.

| Layer | Proposed technology | Reason |
|---|---|---|
| Mobile app | React Native (Expo), with SQLite for offline data | One codebase for Android and iOS |
| Web app and admin panel | Next.js (React) | Shares components and logic with the mobile app |
| API server | Node.js (NestJS or Express), REST API | Same language across the whole stack |
| Database | PostgreSQL | Relational data with strict links between routine, courses and faculty |
| Routine parser | mammoth or docx-parser library (Node.js) | Reads Word tables cell by cell |
| File storage | Cloud object storage | Keeps every uploaded routine file per version |
| Push notifications | Firebase Cloud Messaging (FCM) | Free, works on Android, iOS and web |
| Authentication | Google sign-in restricted to DIU email, JWT sessions | No separate passwords to manage |
| Hosting | Free hosting tiers for the pilot; paid hosting after department approval | No cost while the department evaluates the system (Section 12.2) |

## 9. Data Model

The data model separates the stable structure (batches, courses, faculty) from the routine, which changes by version, so a new routine never requires re-entering reference data.

| Entity | Main fields | Linked to |
|---|---|---|
| Semester | Name (Fall 2026), start and end date, active flag | Routine versions |
| Batch | Code (263), intake semester, status (active or graduated) | Sections |
| Section | Name (A), batch, CRs for the current semester | Lab groups, students, CRs |
| Lab group | Name (A1), section | Students |
| Course | Code, title, credit, type | Class slots |
| Faculty | Internal ID, initial, name, designation, department, contacts, status (active, on leave, left), joined and left dates | Class slots, user account |
| Room | Building (AB-1), room number | Class slots |
| Time slot | Start and end time (08:20–09:50) | Class slots |
| Routine version | Semester, version number, source file, published by, published at | Class slots |
| Class slot | Version, section, lab group (optional), course, faculty, room, day, time slot | Exceptions, attendance |
| Class exception | Class slot, date, type (cancelled, rescheduled, room change, makeup), note, created by | Notifications |
| User | Name, DIU email, role, section, lab group, status (active or alumni) | Extra courses, attendance, notices |
| Extra enrolment | User, course, section | Class slots |
| Notice | Title, body, scope (department or section), author, date | Notifications |
| Attendance record | User, class slot, date, status | — |

A student's routine is computed as: class slots of the active version for their section (theory) and their lab group (lab), plus their extra enrolments, adjusted by any class exceptions on a given date.

Two further tables support administration and the calendar: Admin permission (user, areas granted, granted by, date) and Calendar day (date, type such as holiday or exam week, note), which the routine checks before showing classes.

## 10. Offline Access and Notifications

The app stores the student's routine, notices and faculty directory on the device, so it works on campus without mobile data, and syncs changes as soon as a connection returns.

- **Local storage:** the mobile app keeps a copy in an on-device database; the web app uses a service worker cache.
- **Sync:** on opening the app and on each push notification, the device requests only records changed since its last sync.
- **Freshness label:** every screen shows "Last updated" time, so a student knows whether they are seeing the latest version.
- **Push notifications:** sent for routine changes affecting the student, class exceptions, makeup classes and new notices.
- **Class reminders:** an optional local reminder 10, 15 or 30 minutes before each class, which works offline.

Notifications are targeted: a change to 263-B lab group B2 reaches only the students of that lab group, not the whole department.

## 11. Security and Privacy

Class routines can be viewed without signing in; faculty contacts, notices and personal data are limited to signed-in DIU members, and each role can change only what belongs to it.

- Sign-in with a DIU email address, verified by a one-time code or Google sign-in restricted to the DIU domain.
- Role-based access control enforced on the server for every request, not only hidden in the interface.
- Section scoping: a CR can post only to their own section; faculty only to sections they teach.
- Faculty contact privacy: each teacher chooses which contact details are shown to students.
- Audit log of every import, routine edit, class exception and notice, with who did it and when.
- Encrypted connections (HTTPS) and hashed tokens; no passwords stored in plain text.
- Data minimization: attendance logs are private to the student and are not shared with faculty or the department.

## 12. Implementation Plan and Timeline

The system can be delivered in about 12 weeks, with a pilot on one batch before the whole department goes live.

Each phase starts only after its gate is met: the department approves the design, the import reproduces the Fall 2026 routine file exactly, and the pilot batch confirms the app is reliable.

| Phase | Main deliverables |
|---|---|
| Plan and design | Requirement sign-off with the department, data model, wireframes for student and admin screens |
| Core backend | Sign-in and roles, course and faculty master data with Excel upload, routine import with validation, clash check and version comparison |
| Student apps | Personal routine, extra courses, notices, push alerts, faculty directory, offline storage, attendance log |
| Pilot | One batch (all sections and lab groups) live; admin imports a real revision; issues fixed |
| Launch | All NFE batches onboarded through CRs, admin and CR guides, handover to the department |

### 12.1 Release on Android and iPhone

The pilot reaches every student at no cost; store releases follow only after the department approves the project.

| Stage | Android | iPhone |
|---|---|---|
| Pilot (free) | App file (APK) shared through a download link | Installable web app (PWA): opened in Safari and added to the home screen, with push notifications on iOS 16.4 and later |
| After approval | Google Play Store | Apple App Store |

The mobile app is built once with React Native (Expo) for both platforms. iPhone builds use Expo's cloud build service, so no Mac is required.

### 12.2 Cost

> Updated by Addendum A, section A.4 (hosting providers).

The proposal and pilot run entirely on free services; paid services are needed only if the department adopts the system.

| Item | Pilot | After approval |
|---|---|---|
| Web app and admin panel hosting | Free tier (for example Vercel) | Paid plan, to be quoted |
| API server | Free tier (for example Render) | Paid plan, to be quoted |
| Database | Free PostgreSQL tier (for example Supabase or Neon) | Paid plan, to be quoted |
| Domain | Free subdomain from the hosting provider | Own domain, to be quoted |
| Push notifications (FCM) | Free | Free |
| App builds (Expo) | Free tier | Free tier or paid plan if needed |
| Google Play developer account | Not needed | USD 25, one time |
| Apple Developer Program | Not needed | USD 99 per year |

Free tiers have limits (the API may pause when idle and storage is capped). These are acceptable for a pilot with one batch and will be reviewed before full launch. Free-tier terms will be confirmed at setup.

### 12.3 What the department provides

- The routine as a .docx file for each new version.
- The faculty list: initial, full name, designation and email.
- The course list: code, title, credit and type.
- The academic calendar (holidays and exam weeks).
- Permission to restrict sign-in to DIU email addresses.
- One staff contact who will act as admin for routine uploads.

### 12.4 Measuring success

The pilot will be judged on four measures, reported to the department before full launch:

- **Adoption:** share of pilot-batch students who sign up and open the app at least weekly.
- **Accuracy:** every class in the app matches the published routine file, with no wrong-room or wrong-time reports left unresolved.
- **Fewer routine queries:** CRs report fewer routine questions in section groups.
- **Satisfaction:** a short survey of pilot students and CRs.

### 12.5 Maintenance and handover

- Each semester, an admin uploads the new routine and confirms new batches, graduating batches and faculty changes (Section 7.1); this takes minutes, not days.
- Students and CRs report problems through the in-app report button; the main administrator reviews them.
- The code, an admin guide and a CR guide are documented so the system does not depend on one person.
- If the project lead leaves DIU, the main administrator role and hosting accounts transfer to a person the department names.

## 13. Expected Benefits

The department publishes the routine once, and every student, CR and teacher receives the correct, readable version of it automatically.

**For students**

- A personal routine with only their own section and lab group classes.
- Course titles and teacher names instead of codes and initials.
- Immediate alerts when a class changes, is cancelled or has a makeup session.
- One place for faculty information and academic notices.
- Personal attendance tracking and offline access.

**For Class Representatives**

- Organized, section-specific communication.
- A simple way to publish cancellations and makeup classes.
- Fewer repeated questions about the routine.

**For faculty**

- Their own weekly routine across all sections in one view.
- Fewer routine-related queries from students.
- A direct channel to the sections they teach.

**For department administration**

- Routine publishing with no change to the current preparation process.
- Automatic error and clash checks before publishing.
- Version history, change tracking and rollback.
- Teacher load and room usage views for planning.
- Less dependence on manually distributed routine files.

## 14. Project Scope

The first release covers the NFE Department of DIU only, and focuses on the class routine and the information around it.

**In scope**

- All active NFE batches, sections and laboratory groups (55 section tables in Fall 2026).
- Routine import from the department-issued .docx file, with validation, change preview and version control.
- Grid-based routine editing and teacher and room clash detection.
- Course and faculty master data, including faculty initials.
- Personalized student routines, including extra (retake) courses.
- Class exceptions: cancellations, reschedules, room changes and makeup classes.
- Department and section announcements with targeted push notifications.
- Teacher-wise and room-wise routine views, tap-to-view details for every teacher, course and room, and an empty room finder.
- CR-posted quiz, lab, mid-term and final exam dates and assignment deadlines.
- Semester rollover: new batches, graduated batches, joining and leaving faculty, and CR terms.
- Personal attendance tracking, calendar export, home screen widget, holiday-aware routine and offline access.
- Main administrator with delegated, permission-limited admin access.
- Web application and Android app; iPhone through the installable web app during the pilot.

**Out of scope (first release)**

- Results, grading and CGPA management.
- Course registration and fee payment.
- Online classes and examinations.
- Import of the official exam routine (CRs can still post exam dates).
- Integration with DIU's official student portal.
- Automatic timetable generation.
- Departments other than NFE.

## 15. Risks and Mitigation

The largest risk is a change in the department's routine format; the import step is designed to catch it before anything is published.

| Risk | Impact | Mitigation |
|---|---|---|
| Department changes the routine file layout | Import fails or misreads classes | Strict validation, preview before publish, grid editor as fallback, parser rules kept configurable |
| Routine shared only as PDF | Import not possible in first release | Request the .docx from the department; PDF import planned as an enhancement |
| Students select the wrong section or lab group | Wrong routine shown | Selection confirmed at sign-up; changes logged; CR can flag mismatches |
| Low adoption | Benefits not realized | Launch through CRs and department notice; keep core use free of sign-up friction |
| Faculty details incomplete | Initials shown without names | Pre-filled Excel template; faculty complete own profiles |
| Unauthorized notices | Misinformation | Role and section scoping, admin approval of CRs, audit log |
| Single maintainer | Project stalls after handover | Documented code, admin guide, and a handover plan to the department |

## 16. Future Enhancements

Once the NFE release is stable, the same platform can grow in the following directions:

- Extension to other DIU departments, with configurable time slots and table formats.
- PDF routine import.
- Exam routine, with seat plans and exam-day reminders.
- Free-room finder for students looking for study space.
- Class-level attendance shared with faculty, if the department approves.
- Integration with DIU's student portal for automatic section and course enrolment.
- Assistance for routine planning, suggesting clash-free slots when the admin edits a class.

## 17. Conclusion

NFE Schedule turns the department's existing routine document into a personal, current and readable routine for every NFE student, with no change to how the department prepares it.

By combining automatic routine import, course and faculty information, targeted notifications, class exceptions and offline access in one platform, the project reduces confusion for students, communication work for Class Representatives and distribution work for the department. Its goal is a reliable digital academic companion that keeps each student's schedule organized, updated and accessible whenever needed.

## Appendix: Interface Mockups

Eight screen designs show how the system looks and works, using real data from the Fall 2026 routine: sign-up, home, daily routine, teacher details opened by tapping an initial, academics, empty rooms, menu, and the admin's routine import review. Course titles and teacher names appear as placeholders until the department supplies them.

See `design/app-screens-reference.pdf`.

---

## Addendum A — Revision of Nov 13, 2026

Everything in Sections 1–17 stays. This addendum adds seven requirements and updates the technical plan to match them.

### A.1 CR application for any batch and section; manual CR assignment

- Any signed-in student can apply to be CR of **any** batch-section, chosen from the same batch → section pickers used at sign-up. The request can carry a short message and a phone number.
- The "Apply for CR access" link stays on the Academics tab; a permanent "Apply as CR" entry is added to the Menu, so a student can apply even when their section already has a CR.
- If the chosen section is not the applicant's own, the admin sees this flagged on the request.
- The admin approves or rejects with an optional note; the student is notified either way.
- The admin can **assign a CR manually** without any request: pick an existing user, or enter an email so the role attaches automatically when that student signs up.
- The admin can revoke a CR at any time. The number of CRs per section (default two), whether applications are open, and whether CR roles expire with the semester are admin settings.

### A.2 Manual routine changes by the admin

The grid editor in Section 5.4 becomes a full manual editor:

- Add, edit, move (drag to another day or slot) and delete any class of any section; add sections and lab groups; edit time slots.
- Every manual edit is made on a **draft version** (for example Version 5.1, based on 5), with live clash checking. When ready, the admin sees the same change preview as an import and publishes; only affected students are notified. A "silent fix" option publishes a typo correction without notifications.
- The admin can also build a routine from scratch in the editor if no file is available, fix any warning found during import (for example a lab group written with the wrong section letter), and post a one-day exception (cancel, reschedule, room change, makeup) for any section, the same way a CR does.
- Rollback to any earlier version is kept (Section 5.4) and works by publishing a copy of that version as a new version, so history is never rewritten.

### A.3 Faculty and course import from CSV, Excel, PDF, Word and JSON

- Faculty information and the course list can each be imported from **CSV, Excel (.xlsx), JSON, Word (.docx, and legacy .doc) and PDF**, and both keep the manual add, edit and archive screens.
- Every import follows the same four steps: upload → match columns (detected automatically, adjustable, savable as a preset) → preview with new, updated, unchanged and invalid rows → apply. Nothing changes before the admin presses Apply.
- Rows are matched by initial (faculty) or course code (courses). Existing values are updated only for the columns the file provides, so a file with only names does not erase phone numbers.
- PDF and legacy .doc files carry no reliable table structure, so their preview step always opens for checking. The pre-filled templates (CSV and JSON, built from the Fall 2026 routine) remain the fastest path.
- The routine itself stays .docx-only in the first release (Section 6.3).

### A.4 Online database on Supabase, hosting on Vercel, local database on the phone

This updates Sections 8 and 12.2. There is no separate API server any more:

| Layer | Technology |
|---|---|
| Database, sign-in, file storage, server functions | Supabase (cloud project; PostgreSQL with row-level security, Supabase Auth with Google, Supabase Storage, Edge Functions) |
| Web app, installable web app (PWA) and admin panel | Next.js on Vercel; routine and master-data parsing run in Vercel server functions |
| Phone app | React Native (Expo) with an on-device SQLite database |
| Push notifications | Expo push service for the phone app (delivered through FCM on Android, APNs on iPhone), Web Push for the installable web app; sent by a Supabase Edge Function |
| Scheduled work | A daily Vercel cron (archives superseded routine versions, ends CR terms, keeps the free database active) |

The phone app reads only from its local database. When the phone is online it asks Supabase for every record changed since its last sync and writes those changes locally; personal data entered offline (attendance, notes) is queued and uploaded when the connection returns. Details: `docs/SYNC_AND_OFFLINE.md`.

### A.5 How the phone app gets updates

| What changed | How the phone gets it | Store review needed |
|---|---|---|
| Routine, notices, courses, faculty, rooms, settings, feature on/off, texts | Next sync (seconds after a push, or when the app opens) | No |
| App screens and logic (JavaScript) | Over-the-air update (Expo EAS Update), downloaded in the background and applied on next launch | No |
| Native parts (new permission, new native module, SDK upgrade) | New app build: a new APK link during the pilot, a Play Store update after approval | Play Store only |

The admin panel has an **App releases** page: the admin records each new build and the oldest version still supported. Older phones show "Update available", or a blocking "Please update" screen below the minimum. The Play Store version keeps the same package name and signing key as the pilot APK, so pilot users can move to the Play Store version without losing data. Details: `docs/APP_UPDATES.md`.

### A.6 Everything customizable by the admin (dynamic app)

The app reads its structure from the database instead of hard-coding it. From the admin panel, without a new app version, the admin can change:

- Semester dates, time slots, working days and the week's first day; buildings, rooms, room type and floor.
- Batches, sections, lab groups, courses, faculty and departments.
- The academic calendar (holidays, exam weeks).
- Routine file format rules (how titles, codes, initials and rooms are written), so a changed department layout does not need a developer.
- CR rules, guest access, allowed email domains, reminder choices, the "changed" badge period.
- Which features are switched on, the bottom tabs and their order, the Home cards and their order.
- App name, logo and accent colours; notification texts; any app text in Bangla or English.
- Who can register (email domains or any email), auto registration, sign-in methods.
- Admins and their permission areas (main administrator only).

Details: `docs/ADMIN_CUSTOMIZATION.md`.

### A.7 Design

The screens in `design/app-screens-reference.pdf` are the visual direction: dark theme with a mint accent, one colour per course, five bottom tabs. The light theme uses the logo palette (Ink #14321F, Leaf #2FA35A, Ground #F3F6F1). New screens added by this addendum (CR application, admin CR requests, manual routine editor, master-data import wizard, settings, app releases, update prompts) follow the same style. Details: `docs/DESIGN_SYSTEM.md` and `docs/SCREENS.md`.

### A.8 Sign-in and registration set by the admin

This updates the sign-in rule in Sections 4.2 and 11 (DIU email only) into an admin setting:

- Signing in with Google for the first time **registers the account automatically**; there is no separate sign-up form.
- The admin chooses who may register: only the email domains the admin lists (default `diu.edu.bd`; domains can be added, changed or removed), or **any email address**.
- Auto registration can be turned off: new accounts then wait for admin approval and can only browse routines as a guest meanwhile.
- People the admin has already invited (admins, CRs added by email, teachers in the faculty list) can always sign in.
- The admin can also switch on sign-in with an email one-time code for addresses without Google, block individual addresses, and edit the rejection message.

### A.9 Findings from the Fall 2026 Version 5 file

A second, independent parse of the file confirmed every figure in Section 6 (55 tables, 578 classes, 138 lab sessions, 48 course codes, 79 faculty initials including one guest, 26 rooms, no clashes). It also found six cells whose section letter differs from the table they sit in; the import shows these as warnings for the admin to confirm or correct. Details: `docs/ROUTINE_IMPORT.md`, section "Known data in Fall 2026 V5".
