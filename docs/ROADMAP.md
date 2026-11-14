# Roadmap

Five phases and three gates from the proposal (Section 12). Work is split into feature branches; **the branch name is the feature name** (kebab-case, no prefix). Do them in this order; each one starts from an up-to-date `main`.

Status legend: ☐ to do · ◐ in progress · ☑ done (update this file in the branch that finishes the feature).

## Phase 1 — Plan and design

| Branch | Delivers | Done when |
|---|---|---|
| ☑ `project-setup` | pnpm workspace, `apps/web`, `apps/mobile`, `packages/{core,parser,ui}`, TypeScript strict, ESLint, Prettier, Vitest, move parser test into Vitest, root scripts (`dev`, `build`, `test`, `lint`, `typecheck`) | `pnpm test` runs the Fall 2026 parser test green; `pnpm typecheck` clean |
| ☑ `design-system` | `packages/ui`: tokens → Tailwind preset + RN theme, fonts (Space Grotesk, Inter, Hind Siliguri), icons, core components from `DESIGN_SYSTEM.md` §5, logo SVG + app icons + splash + favicons | A storybook-like `/dev/ui` page on web and a dev screen on mobile show every component in dark and light |
| ☑ `supabase-schema` | Push migrations to the cloud project, fix errors, run `DATABASE.md` §4 checks, generate types, Supabase client helpers for web (SSR) and mobile | Checks pass; types committed |

**Gate 1:** department approves the design (screens 1–8 + N-/A- list).

## Phase 2 — Core backend and admin

| Branch | Delivers (requirement IDs) |
|---|---|
| ☑ `auth-diu-signin` | AUTH-1…3, AUTH-6, AUTH-8, AUTH-9; Google sign-in on web and mobile; email code; guest mode; N-1, N-17; profile bootstrap |
| ☑ `admin-shell` | Admin layout, area-based navigation, dashboard A-0, admins page A-17 (AUTH-4, AUTH-5), audit log A-18 |
| ☑ `app-settings` | `packages/core/settings` schemas + defaults, Settings pages A-16, feature flags, i18n overrides, semesters & time slots, week (ADM-SET-1, ADM-SET-2) |
| ☑ `master-data-manual` | Courses, faculty, departments, batches, rooms pages (ADM-MD-4, ADM-MD-5) |
| ☐ `master-data-import` | Readers for csv / xlsx / json / docx / doc / pdf, import wizard, presets, templates download (ADM-MD-1…3) |
| ☐ `routine-import` | Upload, parse route, review screen (mockup 8), warnings & overrides, apply to draft (ADM-RT-1, ADM-RT-2, ADM-RT-10, ADM-RT-11) |
| ☐ `routine-publish` | Diff preview, publish dialog, version history, rollback (ADM-RT-3, ADM-RT-4, ADM-RT-7) |
| ☐ `routine-editor` | Manual grid editor with drafts, live clash check, silent fix, build from scratch (ADM-RT-5, ADM-RT-6) |
| ☐ `admin-views` | Teacher / room views, load, free rooms (ADM-RT-8), admin exceptions (ADM-RT-9) |

**Gate 2:** importing `fixtures/routine-fall-2026-v5.docx` through the admin panel reproduces the file exactly (578 classes; spot-check 10 cells against the Word file) and publishing works end to end.

## Phase 3 — Student apps

| Branch | Delivers |
|---|---|
| ☐ `routine-core` | `packages/core` routine computation, version in effect, course colours, time formatting, Bangla digits — with tests from the fixture |
| ☐ `offline-sync` | Mobile SQLite schema, sync engine, outbox, triggers, freshness label (SYNC-1…4) |
| ☐ `student-onboarding` | N-1, screen 1, section change (ONB-1…3) |
| ☐ `student-home` | Screen 2 (HOME-1) |
| ☐ `student-routine` | Screens 3, N-2, N-3, N-4, N-16 (RT-2…8, RT-10, RT-11) |
| ☐ `faculty-directory` | Screen 4, N-5, directory (FAC-1, FAC-2) |
| ☐ `academics` | Screen 5, N-6 post form, notices (AC-1…3, NT-1, CR-5) |
| ☐ `cr-management` | N-7 apply, A-10 requests / assign / revoke, CR policy (CR-1…6) |
| ☐ `push-notifications` | push tokens, `push-dispatch` Edge Function, trigger + cron retry, in-app list N-13, Web Push (NT-2, NT-3) |
| ☐ `empty-rooms` | Screen 6, N-9 (RM-1, RM-2) |
| ☐ `student-menu` | Screen 7, N-10 extra courses, N-14 settings, theme, language (ME-1, ME-7, ME-8) |
| ☐ `attendance-notes` | N-11, N-12 (ME-2, ME-3) |
| ☐ `pwa` | Student web pages, service worker, install prompt, iOS push (SYNC-5, UPD-4) |
| ☐ `app-updates` | EAS profiles and channels, OTA banner, App releases page A-15, update sheet / blocking screen N-15 (UPD-1…3, ADM-REL-1) |
| ☐ `reminders-calendar` | Local reminders, .ics / Google Calendar export (NT-4, ME-4) |
| ☐ `faculty-tools` | Faculty routine, quick alerts, self profile edit (FAC-3) |
| ☐ `issue-reports` | Report flow + admin reports A-14 (ME-6, ADM-REP-1) |

## Phase 4 — Pilot

| Branch | Delivers |
|---|---|
| ☐ `pilot-readiness` | Error tracking (Sentry free tier), admin guide and CR guide in `docs/guides/` (Bangla + English), seed of real faculty / course data from the department, preview APK build, Vercel production deploy, daily cron |
| ☐ `pilot-fixes-*` | One branch per fix found during the pilot (e.g. `pilot-fixes-room-chip`) |

**Gate 3:** pilot batch confirms reliability (adoption, accuracy, fewer queries, survey — proposal 12.4).

## Phase 5 — Launch

| Branch | Delivers |
|---|---|
| ☐ `home-widget` | Android widget (ME-5) |
| ☐ `share-export` | Routine as image / PDF, WhatsApp share (RT-9) |
| ☐ `store-release` | Play Store listing assets, production build, signing per `APP_UPDATES.md` §3 |
| ☐ `handover` | Final docs, admin transfer tested |

## Definition of done (every branch)

1. Requirement IDs listed in the branch are met; screens match `SCREENS.md` and the mockups.
2. `pnpm lint && pnpm typecheck && pnpm test` pass; new logic has tests.
3. New tables or columns: migration added, RLS policies added, types regenerated, `sync_pull` list updated if the phone needs the table.
4. New configurable value: added to `app_settings` defaults + zod schema, not hard-coded.
5. Texts in both `en` and `bn`.
6. Works offline where the requirement says so.
7. `ROADMAP.md` status updated.
8. Commits follow `GIT_WORKFLOW.md`.
