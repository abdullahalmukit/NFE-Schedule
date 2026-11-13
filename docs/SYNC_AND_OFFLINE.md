# Sync and offline (SYNC-1 … SYNC-5)

## 1. Principle

The phone app never renders from the network. Every screen reads the local SQLite database; the sync engine is the only code that talks to Supabase for reading. So the app opens instantly, works on campus without data, and shows the same thing online and offline.

## 2. Server side

- Every synced table has `updated_at`, `deleted_at`, `sync_version`. A trigger sets `sync_version = nextval('sync_seq')` on every insert and update; rows are never hard-deleted (`deleted_at` is set instead).
- `rpc('sync_pull', { p_since })` returns `{ server_version, me, <table>: [...rows changed after p_since] }` for every table in its list, filtered by row-level security (it runs as the caller). Guests get public tables; signed-in users also get their own extra courses, attendance and notes.
- The full published routine (≈ 600 rows) is included, so any section's routine works offline (RT-4).

## 3. Phone side (`apps/mobile/src/sync`)

Local database: `expo-sqlite` with Drizzle ORM; schema mirrors the synced tables (same column names, JSON columns stored as text). Local-only tables:

| Table | Purpose |
|---|---|
| `sync_state` | `server_version`, `last_success_at`, `last_error` |
| `outbox` | queued writes: `id, table, op (upsert / delete), payload, created_at, attempts, last_error` |
| `kv` | cached settings snapshot, chosen theme, language (a guest's language lives only here; signed-in users' language is `profiles.locale`) |

**Pull** (`pull()`):
1. Read `server_version` (0 on first run).
2. `rpc('sync_pull', { p_since })`.
3. In one SQLite transaction: upsert every row; delete rows whose `deleted_at` is set; replace `me`; save new `server_version` and `last_success_at`.
4. Emit a "data changed" event; screens re-query.

First run downloads everything (a few hundred KB). A full re-sync (reset `server_version` to 0) runs when the app's local schema version changes, from Settings → "Re-download data", or when the server reports a newer schema (`app_settings.sync.schema_version`).

**Push** (`pushOutbox()`): runs before every pull while online. Items are sent in creation order with `upsert` on the row's client-generated UUID, so retries are safe. On success the item is removed; on a permission or validation error it is dropped and the user sees a toast; on network error it stays and is retried with backoff.

Offline-capable writes: attendance marks, notes, extra courses, notification read state, language / theme. Online-only actions (button disabled with "Needs internet"): posting notices, academic events, class exceptions, CR application, section change (needs server validation), anything in admin.

Conflicts: personal rows have one writer (the owner), so last write wins by `updated_at`. Shared rows are never written offline.

**Triggers** (SYNC-2): app start; app returns to foreground (AppState) if the last sync was over 2 minutes ago; network regained (NetInfo); push received (`data.sync = true`, also in background via `expo-notifications` background handler); pull-to-refresh on Home and Routine; `expo-background-task` every `app_settings.sync.background_minutes` (Android best effort).

**Freshness** (SYNC-4): Home and Routine show "Updated 5 min ago" from `sync_state.last_success_at`; "Offline · showing data from 9:12 AM" when the last attempt failed.

## 4. Settings and feature flags on the phone

`app_settings`, `feature_flags`, `i18n_overrides` are synced like any table. `packages/core/settings` parses each key with its zod schema and falls back to the built-in default when a value is missing or invalid, so a bad admin edit cannot break the app. A feature flag hides its screen or button when `enabled = false`, when the user's role is not listed, or when `min_app_version` is higher than the running app.

## 5. Reminders and widget

Local class reminders are scheduled with `expo-notifications` after every successful pull (cancel all, schedule the next 7 days from the computed routine). The Android widget reads the same local data and refreshes after each pull.

## 6. Web / PWA (SYNC-5)

- Signed-in web pages query Supabase directly through TanStack Query, with persisted cache (IndexedDB) so the last data shows offline.
- Service worker (`apps/web/public/sw.js`, built with Serwist): precaches the app shell, caches GET requests to the Supabase REST endpoints for published routine data with stale-while-revalidate, and handles Web Push.
- The student PWA on iPhone uses the same pages; push needs iOS 16.4+ and "Add to Home Screen".
