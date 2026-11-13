# Design system

Sources: `design/logo-sheet.png` (logo, palette) and `design/app-screens-reference.pdf` (8 screens, the visual direction). Tokens: `design/tokens.json` → `packages/ui` (Tailwind v4 theme CSS for web, theme object for React Native). Never hard-code a colour or size in a screen; use tokens.

## 1. Brand

- Logo mark: three rounded squares and a leaf in a 2×2 grid (a routine grid that grows). Wordmark "NFE Schedule": **NFE** bold, **Schedule** regular, Space Grotesk.
- Palette: Ink `#14321F`, Leaf `#2FA35A`, Ground `#F3F6F1`; app icon leaf `#5FD18A`.
- Lockups: horizontal (mark + wordmark + "Class routine · NFE Department, DIU"), mark only (favicon, small sizes), reversed on Ink.
- Export from the sheet (or redraw as SVG in `packages/ui/assets/`): app icon 1024 px (mark on Ink, rounded square), Android adaptive icon (foreground mark, background Ink), splash (mark on Ink), favicon 32/180/512, PWA maskable icon. The admin's `branding.logo_path` only replaces the in-app header logo, not the installed icon.

## 2. Themes

**Dark (default, as in the mockups)** — background `#0C131B`, cards `#161E29`, raised `#1C2532`, borders `#263140`, text `#F1F5F9`, muted `#94A3B8`, accent mint `#3DDC97` with dark text on it, warning amber `#F4B446`, info blue `#70AFF2`.

**Light** — built on the logo: background Ground `#F3F6F1`, cards white, raised `#ECF1EA` (chips, tiles and pills on a white card), text Ink `#14321F`, accent Leaf Dark `#1E7A43` with white text, warning `#94600F`, info `#2A66A8`, danger `#B23A44`. Leaf `#2FA35A` itself is too light for text and white labels to pass AA; it stays in the logo and icons. The warning, info and danger values are darker than the first draft for the same reason (checked by `packages/ui/src/theme.test.ts`).

Both themes also have `purple` / `purpleSoft` for the fourth menu tile (Notes).

Theme follows the system by default; Settings → Theme: System / Dark / Light.

## 3. Type

| Role | Font | Size / weight | Used for |
|---|---|---|---|
| Display | Space Grotesk | 32 / 700 | "No classes today", screen titles ("Routine", "Empty rooms") |
| Title | Space Grotesk | 24 / 700 | Card titles (next class), room numbers |
| Heading | Inter | 20 / 600 | Section headings ("Sunday, 8 November", "This week") |
| Body | Inter | 16 / 400–600 | Class titles, list rows |
| Small | Inter | 14 / 400 | Code · teacher · room lines, helper text |
| Caption | Inter | 12 / 600, uppercase, letter-spacing .06em | "NEXT CLASS · TOMORROW", "STEP 2 OF 2", "MY SCHEDULE" |

Bangla: Hind Siliguri for Bangla text at the same sizes (line height +10 %). Numbers in Bangla mode use Bangla digits (`packages/core/format/digits.ts`). Times always as `08:20`, 12-hour style without am/pm to match the department file, with 24-hour available in Settings.

## 4. Shape and spacing

Radius: chips 10, buttons 16, cards 20, sheets 28, pills full. Screen padding 20. Gaps 8 / 12 / 16 / 24. Touch targets ≥ 44 px. Cards have no shadow in dark mode; a 1 px border or slightly lighter surface separates them.

## 5. Components (from the mockups)

| Component | Notes |
|---|---|
| Choice chip | Batch / section / lab group pickers: unselected = surface with border, selected = accent fill, dark text. Lab groups as two wide chips. |
| Primary button | Full width, accent fill, 56 px tall, bold label ("Show my routine"). |
| Next-class card | Accent fill, caption line, Space Grotesk title, code · type, then time · initial · room in one bold row. |
| Class row (Home list) | Coloured time tile (course colour, tinted bg + coloured text) + title + "code · initial · room". |
| Class card (Routine daily) | Filled with course colour; title, "code · Lab/Theory", chips for teacher (person icon) and room (pin icon); lab-group badge top-right; time rail on the left with start and end. |
| Free-time block | Dashed border, "Free time", range, duration pill. |
| Segmented control | Daily / Weekly. |
| Date strip | 7 day chips, today/selected filled accent. |
| Info banner | Surface card with icon (amber for attention, accent for refresh/version). |
| Teacher header | Round avatar with initial in accent on dark green, name, designation, department; Call (primary) and Email (secondary) buttons. |
| "Teaches you" card | Accent border, caption in accent. |
| Week schedule rows | Day label + time/section pills; the student's own class highlighted in accent. |
| Tabs with underline | Academics: Exams / Deadlines / Notices. |
| Date tile | `[MON]` over `[DD]` in a raised square. |
| Status pills | Amber "In class time", neutral "Syllabus: …", room. |
| Room card | Building small, number large (Space Grotesk), "Lab" info pill. |
| Menu tiles | 2×2 tiles with tinted icon squares (amber, green, purple, blue). |
| Settings list | Grouped rows with title, subtitle, chevron. |
| Bottom nav | 5 tabs, icon + label, active in accent. |
| Admin | Desktop layout: top bar with app name ("NFE Schedule **Admin**"), section links, user at right; stepper; stat cards; data tables with inline inputs; right column panels ("Batches in this file", "Checks"); "New" green pill, count pills in amber. |

## 6. Course colours

`coursePalette` (8 colours per theme). Colour index = stable hash of the course code (`packages/core/format/courseColor.ts`), so a course has the same colour on every screen and every device. Admin can override per course later if needed.

## 7. Motion and feedback

200 ms ease for sheets and tab changes; swipe between days follows the finger; skeletons instead of spinners on first load; toasts at the bottom above the nav; haptic tick on chip selection (mobile).

## 8. Accessibility

Contrast AA in both themes (check accent text on course colours); every icon button has a label; Dynamic Type / font scaling up to 130 % without clipping; never rely on colour alone (lab badge text, "Changed" text label).

## 9. In code (`packages/ui`)

| Entry | Contents |
|---|---|
| `@nfe/ui` | `tokens`, `getTheme`, `courseTone`, `toneColors`, contrast helpers, logo geometry, icon names, gallery sample data |
| `@nfe/ui/theme.css` | Tailwind v4 theme generated from the tokens (`pnpm --filter @nfe/ui build:css`); colours are CSS variables, so `data-theme="dark"` / `"light"` switches them, otherwise the system decides |
| `@nfe/ui/web` | React DOM components (Tailwind classes) |
| `@nfe/ui/native` | React Native components, `UiProvider` (theme preference + locale), `Text` with the type scale (Hind Siliguri in Bangla), `FONT` names |

Generated assets: `pnpm --filter @nfe/ui build:assets` draws the logo mark from `src/logo.ts` into `packages/ui/assets/*.svg`, the app icon, adaptive icon and splash (`apps/mobile/assets/`), and the favicon, Apple touch icon and PWA icons (`apps/web/app/`, `apps/web/public/icons/`).

Galleries (development only): web `/dev/ui` (dark and light side by side), mobile `/dev/ui` (theme switch at the top).
