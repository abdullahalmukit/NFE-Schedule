# How updates reach users (UPD-1 … UPD-4)

There are three kinds of change, and each reaches phones a different way.

| Kind of change | Examples | Path | Store review |
|---|---|---|---|
| **Data and settings** | New routine version, notice, course title, room, time slots, feature switched off, tab order, app text, logo | Saved in Supabase → next sync on every phone (seconds after a push; at the latest when the app opens) | No |
| **App code (JavaScript)** | New screen, changed layout, bug fix, new admin-controlled feature | EAS Update (over the air) | No |
| **Native code** | New permission, new native library, Expo SDK upgrade, app icon / splash change | New binary: APK (pilot) or Play Store / App Store | Stores only |

The app is built so most changes are the first kind (see `ADMIN_CUSTOMIZATION.md`), and most of the rest are the second.

## 1. Over-the-air updates (EAS Update)

`apps/mobile/app.config.ts`:

```ts
runtimeVersion: { policy: "fingerprint" },   // OTA only reaches builds with the same native code
updates: { url: "https://u.expo.dev/<project-id>", checkAutomatically: "ON_LOAD", fallbackToCacheTimeout: 0 },
```

`apps/mobile/eas.json` build profiles and channels:

| Profile | Output | Channel | Used for |
|---|---|---|---|
| `development` | dev client | `development` | local work |
| `preview` | APK (`android.buildType: "apk"`) | `preview` | pilot download link |
| `production` | AAB (`app-bundle`), iOS IPA | `production` | Play Store / App Store |

`cli.appVersionSource: "remote"` and `autoIncrement: true` keep `versionCode` increasing across all builds.

Shipping a JavaScript change: `eas update --channel preview --message "Fix room chip"` (and `--channel production` after the store launch). On the phone (`src/updates/ota.ts`): at launch `expo-updates` fetches the update in the background; when ready, a small banner "Update ready — Restart" appears; if ignored, it applies on the next cold start. Critical fixes can be marked by setting `app_settings.ota.force_restart_below` so the app restarts immediately after download.

## 2. New binaries and the App releases page

Table `app_releases` (admin page **Admin → App releases**, area `releases`):

- version name and code, platform, channel, notes (English / Bangla), mandatory flag;
- **minimum supported version code**;
- APK file uploaded to the public `app-releases` bucket (pilot) or a store URL (after approval).

On start and once a day, the app (`src/updates/releases.ts`) reads the newest release for its platform and channel from local data:

- running code < newest code → dismissible sheet "Version 1.4 is available" with notes and **Download** (opens the APK link) or **Update** (opens the Play Store page / in-app update);
- running code < `min_supported_code` → blocking full-screen "Please update to continue", with the same button. Offline users can still open their saved routine from this screen.

Pilot APK installs need the phone's "Install unknown apps" permission for the browser; the download sheet shows a two-line explanation in Bangla and English.

## 3. Moving from the pilot APK to Google Play

Both must use the **same application ID** and the **same signing key**, so the Play Store version installs over the APK and keeps local data:

1. The application ID is **final: `com.diu.nfeschedule`** — Android package name and iOS bundle identifier, set in `apps/mobile/app.config.ts`. It must never be changed: a different ID is a different app to Android, the Play Store and the App Store, so users would lose updates and local data. (URL scheme: `nfeschedule`.)
2. Let EAS create and keep the Android keystore (`eas credentials`). Back up the keystore file and passwords outside EAS.
3. When creating the Play Console app, enrol in Play App Signing with **"Use existing app signing key"** and upload the same keystore (export from `eas credentials`). The upload key can be the same key.
4. Publish the first Play build with a higher `versionCode` than the last APK. Add a release in Admin → App releases with the Play Store URL on the `production` channel and raise the `preview` channel's minimum so APK users are guided to the Play Store.

If a Google-generated key is ever chosen instead, APK users must uninstall first; their data comes back on the next sign-in because everything except unsent offline entries lives in Supabase.

After the Play launch, in-app updates (Play Core, via `sp-react-native-in-app-updates`) can replace the "open Play Store" button; the App releases check stays as the source of truth for minimum versions.

## 4. iPhone

Pilot: the PWA updates itself on the next load after a Vercel deployment. After App Store approval: same EAS profiles (`production` channel), OTA updates work the same way; binary updates go through App Store review.

## 5. Web and admin panel

Every push to the main branch deploys on Vercel. `/api/version` returns the deployment id; the web app checks it when the tab regains focus and shows "A new version is available — Reload". The service worker uses `skipWaiting` only after the user taps Reload, so forms are never interrupted.

## 6. Checklist for each kind of release

- **Data / settings**: nothing to do — save in the admin panel.
- **JavaScript**: `eas update --channel preview` (and `production`); note it in the changelog.
- **Native**: bump `version` in `app.config.ts` → `eas build --profile preview` (APK) / `production` (AAB) → upload in Admin → App releases (pilot) or Play Console → raise minimum supported version only when old builds would break.
