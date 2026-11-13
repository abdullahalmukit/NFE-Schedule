# NFE Schedule

Class routine platform for the Department of Nutrition and Food Engineering, Daffodil International University.

The department keeps publishing its routine as a Word file. An admin uploads it; every student gets a personal routine (only their section and lab group, with course titles, teacher names and rooms) on the web, as an installable web app and on Android, working offline. Class Representatives and teachers post notices, exam dates and class changes, and only the students affected are notified.

## Stack

| Part | Technology |
|---|---|
| Web app, installable web app, admin panel | Next.js on Vercel |
| Phone app | React Native (Expo), on-device SQLite |
| Database, sign-in, files, push sending | Supabase (cloud) |
| Routine and data import | `packages/parser` (Node.js) |

## Repository

```
apps/web          Next.js: student web app + /admin
apps/mobile       Expo app
packages/core     shared logic: routine computation, settings, i18n, types
packages/parser   routine .docx parser, faculty / course importers
packages/ui       design tokens and shared components
supabase/         migrations and edge functions
fixtures/         Fall 2026 V5 routine file and its expected parse
templates/        faculty and course import templates
design/           logo, screen mockups, tokens
docs/             proposal, requirements, architecture and feature specs
```

## Documentation

Start with `docs/PROPOSAL.md`, then `docs/REQUIREMENTS.md` and `docs/ROADMAP.md`.

## Getting started

```
sh scripts/setup-git.sh            # repository identity and hooks
pnpm install
pnpm test:parser                   # Fall 2026 V5 routine parse check
cp .env.example apps/web/.env.local
```

Supabase, Vercel and Expo setup: `docs/ARCHITECTURE.md` section 6.

## Author

Mukit · abdullahalmukit287@gmail.com
