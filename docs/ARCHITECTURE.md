# Architecture

## 1. Overview

```
 Phone app (Expo)            Web app + PWA + Admin (Next.js on Vercel)
 local SQLite  ──sync──┐      │  server routes: imports, publish, cron
                       ▼      ▼
                 Supabase (cloud project)
                 ├─ Postgres + row-level security + SQL functions
                 ├─ Auth (Google, DIU domain hook)
                 ├─ Storage (imports, routine-files, faculty-photos, app-releases, branding)
                 └─ Edge Function push-dispatch ──► Expo push (Android/iOS) / Web Push (PWA)
```

There is no separate API server. Clients talk to Supabase directly with the anon key and the user's session; row-level security decides what each person may read or write. Work that needs the service-role key or heavy parsing runs in Next.js route handlers on Vercel (Node.js runtime). Pushes are sent by one Supabase Edge Function.

The database lives only in the cloud Supabase project. Local Docker Supabase (`supabase start`) is not used; migrations are pushed to the linked cloud project.

## 2. Repository layout

```
nfe-schedule/
├─ apps/
│  ├─ web/            Next.js (App Router, TypeScript)
│  │  ├─ app/(student)/        public + student PWA: /, /routine, /academics, /rooms, /menu, /s/[section]
│  │  ├─ app/admin/            admin panel: /admin/routine, /admin/courses, /admin/faculty, ...
│  │  ├─ app/api/admin/import/ route handlers: parse, apply (Node runtime)
│  │  ├─ app/api/admin/routine/publish
│  │  ├─ app/api/cron/daily    Vercel cron -> rpc daily_maintenance
│  │  └─ public/sw.js          service worker (app shell + data cache, web push)
│  └─ mobile/         Expo (expo-router, TypeScript)
│     ├─ app/(tabs)/           home, routine, academics, rooms, menu
│     ├─ src/db/               expo-sqlite + drizzle schema and migrations (mirror of synced tables)
│     ├─ src/sync/             sync engine (pull, outbox push, triggers)
│     └─ src/updates/          EAS Update check + app_releases check
├─ packages/
│  ├─ core/           shared, platform-free TypeScript
│  │  ├─ routine/compute.ts     personal routine for a date (RT-1)
│  │  ├─ routine/version.ts     version in effect for a date
│  │  ├─ settings/schema.ts     zod schema per app_settings key + defaults
│  │  ├─ i18n/{en,bn}.ts        strings; overrides from i18n_overrides
│  │  ├─ types/database.ts      generated: supabase gen types typescript
│  │  └─ format/                times ("01:10" ↔ 13:10), Bangla digits, course colour hash
│  ├─ parser/         file parsing (Node runtime only)
│  │  ├─ docx/                  zip + Word table reader (no dependencies) — done
│  │  ├─ routine/               routine parser, clash check, version diff — done, tested
│  │  └─ master/                faculty / course import: csv, xlsx, json, docx, doc, pdf
│  └─ ui/             design tokens (design/tokens.json) -> Tailwind theme CSS + RN theme; web and native components; icons
├─ supabase/
│  ├─ migrations/     SQL, applied with `supabase db push`
│  └─ functions/push-dispatch/
├─ fixtures/          real routine file + expected parse
├─ templates/         faculty / course import templates
├─ design/            logo, mockups, tokens
└─ docs/
```

Tooling: pnpm workspaces, TypeScript strict, Vitest, ESLint, Prettier. UI: Tailwind CSS v4 on web (shadcn/ui primitives added when admin dialogs and tables need them), React Native `StyleSheet` with the shared theme on mobile; both fed by `packages/ui`. Data on web: `@supabase/ssr` + TanStack Query. Icons: lucide (web) / lucide-react-native.

## 3. Main flows

### 3.1 Routine import → publish

1. Admin picks the .docx on `/admin/routine/import`. The browser uploads it straight to Storage `imports/<runId>/<file>` (avoids Vercel's 4.5 MB request limit) and inserts an `import_runs` row (`status = uploaded`).
2. Browser calls `POST /api/admin/import/routine/parse {runId}`. The route checks `has_admin_area('routine')` with the caller's session, downloads the file with the service role, runs `parseRoutineDocx(file, rulesFromSettings)`, then resolves codes / initials / rooms / batches against the database and stores everything in `import_runs.result` (`status = parsed`): stats, issues, unknown codes and initials, new / missing batches, and the diff against the version in effect.
3. Review screen (mockup 8) reads `result`. Inline edits to faculty and courses are saved to master data immediately (they are permanent reference data); warnings are accepted or corrected per row (corrections stored in `result.overrides`).
4. `POST /api/admin/import/routine/apply {runId}` creates missing batches / sections / lab groups / rooms / buildings (only those the admin confirmed), inserts a draft `routine_versions` row and its `class_slots` in one transaction (SQL function or a single batched insert), copies the file to `routine-files/`.
5. `POST /api/admin/routine/publish {versionId, effectiveFrom, notify, summary}` recomputes the diff, maps affected "263-B" / "263-B/B2" keys to ids and calls `rpc publish_routine_version(...)`.

Manual edits (ADM-RT-5) skip steps 1–4: the editor creates a draft version copied from the version in effect, edits its `class_slots` directly (RLS: admin area `routine`), runs `detectClashes` live in the browser, then uses the same publish route.

### 3.2 Notifications

1. Inserts into `class_exceptions`, `notices`, `academic_events`, and the publish / CR functions create one `notification_events` row with a `target`.
2. A trigger on `notification_events` (added in a migration once the project URL is known) calls the Edge Function `push-dispatch` through `pg_net`, with the URL and a shared secret read from Supabase Vault. A `pg_cron` job every 5 minutes re-sends events whose `dispatched_at` is still null.
3. `push-dispatch` (service role) resolves recipients with `event_recipients(event_id)`, loads their `push_tokens`, sends Expo pushes in batches of 100 and Web Push to PWA subscriptions, removes dead tokens, sets `dispatched_at` and `dispatch_log`.
4. Every push carries `data: {sync: true, kind, id}` so the phone syncs immediately on receipt.

### 3.3 Sync — see `docs/SYNC_AND_OFFLINE.md`.

### 3.4 App updates — see `docs/APP_UPDATES.md`.

### 3.5 Sign-in (AUTH-1…3, AUTH-6, AUTH-8, AUTH-9)

- **Who may register** is decided only on the server: the "Before User Created" hook (`hook_before_user_created`) applies `auth.signup` (restricted domains or any email, blocked emails; invited people always allowed). The apps read the public `auth.signup` setting just to show the right buttons, the domain hint and the admin's rejection message in Bangla or English (`packages/core/settings/auth-signup.ts`).
- **Web:** "Continue with Google" → `signInWithOAuth` (with Google's `hd` hint when exactly one domain is allowed) → Supabase → `/auth/callback` (code exchange; a refused sign-up comes back as `?error_description=` and is shown on `/sign-in`) → `/auth/next` sends the user by account state. Email code (when `email_otp` is on): `signInWithOtp` + `verifyOtp`.
- **Phone:** native Google account picker (`@react-native-google-signin/google-signin`, configured with the **Web** client ID) → ID token → `signInWithIdToken`. Needs a development or release build; Expo Go cannot load the native module. On Android no config plugin is needed; for iOS add the plugin with `iosUrlScheme` once an iOS OAuth client exists.
- **Account state → screen** (`authStage` in `packages/core`): no session → N-1; guest → app with public data only; `pending` → N-17 (re-checks every 30 s and on focus until push arrives); `disabled` → N-17 not-active variant; `active` / `alumni` → app.
- **Guest mode (AUTH-2):** web cookie `nfe-guest`; phone secure-store key `nfe.guest`. Row-level security, not the UI, limits what guests read.
- **First sign-in** creates the profile (`handle_new_user`): main admin by `auth.main_admin_email` (AUTH-3), faculty account linked by email (AUTH-6), invited admins / CRs / faculty active at once, everyone else active or pending per `auto_register` (AUTH-8). Language: new profiles get `i18n.default_locale`.

## 4. Security model

- Row-level security on every table (`supabase/migrations/..._security.sql`). Helpers: `has_admin_area(area)`, `is_main_admin()`, `is_cr_of(section)`, `teaches_section(section)`, `can_post_to_section(section)`.
- Faculty base table is admin-only; everyone reads `faculty_public` (guests) or `faculty_directory` (signed in, contacts filtered by each teacher's `contact_visibility`).
- Attendance, notes, extra courses: readable only by their owner — not by admins.
- Students cannot change their own account type, status, faculty link or email (trigger `guard_profile_update`); teachers can change only their contact fields (`guard_faculty_self_update`).
- Service-role key: only in Vercel server environment and Edge Function secrets. Never in `NEXT_PUBLIC_*` or Expo `EXPO_PUBLIC_*` variables.
- Supabase clients: web `apps/web/lib/supabase/client.ts` (browser), `server.ts` (server, user's session; `apps/web/proxy.ts` refreshes the session cookie), `admin.ts` (service role, `server-only`); phone `apps/mobile/src/lib/supabase.ts` (session in expo-secure-store, chunked). All typed with `Database` from `@nfe/core`.
- Every admin-managed table has an audit trigger.

## 5. Environments and variables

One Supabase cloud project for the pilot (create a second "staging" project later if needed).

| Variable | Where | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel, `apps/web/.env.local` | public |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel (server only) | secret |
| `CRON_SECRET` | Vercel | checked by `/api/cron/daily` |
| `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `apps/mobile/.env`, EAS env | public |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` | EAS env | Google sign-in |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Vercel (public key also as `NEXT_PUBLIC_VAPID_PUBLIC_KEY`), Edge Function secrets (private) | Web Push |
| `PUSH_DISPATCH_SECRET` | Edge Function secret + Vault | trigger → function auth |
| `EXPO_ACCESS_TOKEN` | Edge Function secret | optional, for Expo push security |

See `.env.example`.

## 6. One-time setup (owner does the clicks; the code and SQL are in the repo)

1. Supabase: create project → `supabase link --project-ref <ref>` → `supabase db push`.
2. Supabase Auth: enable Google provider (client IDs from Google Cloud Console); keep "Allow new users to sign up" on (registration is controlled by the hook and `auth.signup`, not by this switch); enable the Email provider with OTP only if the admin will use email codes; add redirect URLs (Vercel domain, `nfeschedule://` app scheme); Hooks → Before User Created → `public.hook_before_user_created`.
3. Set `app_settings.auth.main_admin_email` to the owner's email (SQL editor or first-run screen), then sign in.
4. Edge Function: `supabase functions deploy push-dispatch`, set its secrets; store its URL and `PUSH_DISPATCH_SECRET` in Vault; push the trigger migration.
5. Vercel: import the repo, root `apps/web`, set env vars, add cron `0 0 * * *` → `/api/cron/daily` in `vercel.json`.
6. Expo: `eas init`, `eas build -p android --profile preview` for the pilot APK; FCM credentials uploaded with `eas credentials`.

## 7. Design decisions

| Decision | Reason |
|---|---|
| Supabase instead of a Node API server | One service for database, auth, storage and functions; free tier; RLS keeps rules in one place. |
| Parsing in Vercel route handlers | Node runtime, same TypeScript package as tests, service-role access, no extra server. |
| Dependency-free .docx reader | Exact control over cells, merged cells and soft line breaks; verified on the real file; runs anywhere Node runs. |
| Whole published routine synced to the phone (~600 rows) | Any section viewable offline; tiny size; simpler than per-user filtering. |
| Soft deletes + global `sync_seq` | One cursor per phone for all tables; tombstones let phones delete local rows. |
| Diff in TypeScript, publish in SQL | Same diff code for import and manual edits; publish stays one atomic transaction. |
| Settings as validated JSON | Admin can change structure without a release; zod schemas in `packages/core` keep values safe. |
