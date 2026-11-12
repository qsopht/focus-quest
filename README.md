# Focus Quest

An ADHD-friendly school productivity app for middle-school (and up) students. The goal on every
screen is to answer four questions as simply as possible: **what do I need to do, what's next,
when's it due, and how much progress have I made** — framed as quests, not chores.

This is a fully working, persisted application (real SQLite database, real REST API) — not a
mockup. Sample data for a demo student ("Jordan") is included so the app is interesting to explore
immediately after setup.

## Quick start

Requires Node.js 18+.

```bash
npm install
cp server/.env.example server/.env
npm run seed
npm run dev
```

- `npm run seed` creates `server/prisma/dev.db` (SQLite) and fills it with a realistic demo
  student: quests due today/this week/upcoming/overdue, a multi-step project in progress, some
  completed history, focus session history, unlocked + locked achievements, routines, a backpack
  checklist, and a couple of brain dump notes.
- `npm run dev` runs the API (http://localhost:4000) and the Vite dev client
  (http://localhost:5173) together. Open the client URL and pick "Jordan" from the profile picker
  (no password — see [Authentication](#authentication-model) below).

Re-run `npm run seed` any time to reset back to the clean demo state (it wipes and recreates all
data).

## Live demo (Railway)

**https://web-production-7b7819df.up.railway.app**

The server now also serves the built client as static files (`server/src/index.ts`), so the whole
app runs as a single Node process in production — one Railway service, one URL, no separate
frontend host needed.

Deployed as: project `focus-quest`, service `web`, with a persistent volume mounted at `/data`
(`DATABASE_URL=file:/data/dev.db`) so the SQLite file survives restarts without needing to switch
database engines. `npm start` (root `package.json`) runs `prisma migrate deploy` → `npm run seed`
→ `node dist/index.js` every time the service (re)starts — so the live demo always resets to the
same clean "Jordan" demo state after a redeploy or restart. That's a deliberate choice for a
public demo link with no password, not a pattern to carry into a real deployment with real student
data.

To redeploy after making changes (requires the Railway CLI, already linked to this project via
`railway init`):

```bash
railway up --service web --ci
```

Config lives in `railway.json` (build/start commands) plus the `DATABASE_URL`, `JWT_SECRET`, and
`NODE_ENV` variables set on the `web` service (`railway variable list --service web`).

## Continuous integration

`.github/workflows/ci.yml` runs on every push/PR to `main`: installs dependencies (which also
regenerates the Prisma client via the `postinstall` hook — required on any fresh checkout, not
just CI), applies migrations, runs the seed script end-to-end, typechecks both workspaces, builds
both workspaces, and boots the built server to confirm `/api/health` responds. There's no automated
test suite yet (see [Known limitations](#known-limitations)), so this is a build/boot smoke check
rather than real test coverage — it mainly exists to prove the app works on a clean Linux runner,
not just the machine it was built on.

## Architecture

npm workspaces monorepo:

```
server/   Express + TypeScript REST API, Prisma ORM, SQLite
client/   React + TypeScript + Vite + Tailwind CSS, TanStack Query for server state
```

**Why SQLite?** The spec's preferred stack is MySQL/Postgres, but the priority for an MVP is
running with minimal setup — no Docker, no external DB server. Prisma's schema/query API is the
same across SQL databases, so moving to Postgres or MySQL later is a two-line change
(`server/prisma/schema.prisma`'s `datasource` block) plus a fresh `prisma migrate`; nothing in the
route/service code is SQLite-specific except that one JSON column (`avatarConfig`) is stored as a
string rather than a native `Json` type.

**Why no password login?** Students pick a profile from a short list, like choosing a save file —
no typing, nothing to forget. The backend still issues a real JWT and models a proper `Student`
account, so swapping in real auth (password, school SSO, etc.) later doesn't require a data model
change — only the `/api/auth` routes change.

**State management:** TanStack Query handles all server data (caching, invalidation, optimistic
re-fetch after mutations). A small React Context (`AuthContext`) tracks only "who's logged in."
There's no Redux/Zustand — the app doesn't need it.

### Data model

See `server/prisma/schema.prisma` for the full schema. Highlights:

- **XP is a ledger, not a mutable counter.** Every XP award writes an `XPTransaction` row; the
  `Student.totalXp` field is a cache kept in sync in the same transaction. This matches the spec's
  requirement to maintain real XP history instead of just a number that can silently change.
- **`Stars` are a separate spendable currency** from `totalXp`. XP (for leveling) is never spent or
  reduced — "never remove XP for a missed day" extends naturally to "never remove XP for spending
  it on cosmetics." Stars are earned alongside XP (roughly half the XP amount) and spent in the
  Reward Store.
- **Streaks are weekly-participation based**, not consecutive-day based: `ActivityDay` records any
  day the student did something meaningful. The UI shows "active N of the last 7 days" and never
  shows a "broken streak" state.
- **Achievements** are a static catalog (`Achievement`) checked against simple predicates
  (`server/src/lib/xp.ts`) every time XP is awarded — e.g. "Breaking It Down" unlocks the first time
  a multi-step quest is fully completed.
- **Routines** use a template (`Routine`/`RoutineItem`) plus a day-keyed `RoutineCompletion`, so
  "check it off today" resets automatically the next day without deleting the routine itself.

### API

REST API under `/api`. Auth is a bearer JWT obtained from `/api/auth/login` (or `/api/auth/profiles`
to create a new profile). Representative endpoints:

- `GET/POST /api/assignments` (`?bucket=today|week|upcoming|overdue|active|completed|all`),
  `POST /api/assignments/:id/complete`, `/:id/steps`, `/:id/steps/:stepId/complete`,
  `/:id/suggest-steps`
- `GET /api/me` — level, XP, stars, streak, achievement count (the one summary call the dashboard
  needs)
- `POST /api/focus-sessions`, `/:id/finish`
- `GET/POST /api/routines`, `/items/:id/complete`
- `GET /api/achievements`, `GET/POST /api/rewards/:id/purchase|equip|unequip`
- `GET/POST /api/checklist`, `/api/calendar-events`, `/api/reminders`
- `GET/POST /api/braindump` (+ `/:id/convert-to-assignment|reminder|event|checklist`,
  `/:id/keep-as-note`, `/:id/suggest-category`)
- `POST /api/recommendations/next` (+ `/:id/accept`, `/:id/dismiss`) — the "What Should I Do Now?"
  engine
- `POST /api/activity/checkin`, `/api/activity/review-upcoming` — once-per-day planning rewards
- `GET /api/me/progress` — positive-milestone counts for the Rewards page

### Frontend pages

`Home` (dashboard) · `MyQuests` · `Calendar` · `Focus` · `Rewards` · `Settings` — matching the nav
the spec asked for; the main nav still has exactly these 6 items. `BrainDump` (`/brain-dump`) is a
7th page, reached via a floating action button on every screen and from Home's quick actions —
deliberately *not* added to the nav bar, to keep primary navigation unchanged per the enhancement
brief's "preserve existing navigation."

## Executive-function enhancements

Three features layered onto the MVP above, each reusing existing components/models wherever
practical rather than introducing parallel systems.

### 1. Brain Dump

`BrainDumpEntry` now has a `status` (`unsorted` → `processed`, reserved `archived` for later) plus
`convertedItemType`/`convertedItemId` (generalizing the old single `convertedToAssignmentId` field).
Capture is available from literally anywhere via `components/BrainDumpFab.tsx`, a floating button
(mounted once in `App.tsx`, so an unsaved draft survives navigating to another page) that opens a
lightweight popover — not a full-screen sheet, deliberately, per "avoid making this another
complicated task-management screen." The dedicated `/brain-dump` page lists Unsorted entries with
one-tap conversions (`server/src/routes/braindump.ts`: `/convert-to-assignment`,
`/convert-to-reminder`, `/convert-to-event`, `/convert-to-checklist`, `/keep-as-note`) and a muted
Processed list showing what each became. "Help me organize these" uses a deterministic keyword
heuristic (`server/src/lib/brainDumpHeuristics.ts`, same no-AI-required philosophy as the existing
`stepSuggestions.ts`) — never required for capturing or converting.

### 2. Process-based rewards

`awardXp()` (`server/src/lib/xp.ts`) gained an anti-farming mechanism: pass `oncePerEntity: true`
with an `actionType`/`relatedEntityType`/`relatedEntityId`, and a **database unique constraint**
(`@@unique([studentId, actionType, relatedEntityType, relatedEntityId])` on `XPTransaction`) makes
"award this at most once" atomic — not a check-then-insert race. This was found to matter in
practice: a find-then-create version of the same guard let two near-simultaneous requests (e.g.
React 18 StrictMode's intentional double effect-invoke in dev) both pass the check and double-award
XP before either insert committed; the unique constraint (SQLite, like standard SQL, treats NULL as
distinct from NULL, so the many un-tagged transactions never collide with each other) closes that
race regardless of cause. New reward actions, all additive (existing amounts like quest/step/focus
completion are unchanged, to avoid re-tuning the level curve): adding a due date (+3, once per
assignment), setting a subject (+5, once per assignment), breaking an assignment into steps (+5,
once per assignment), finishing every step of a multi-step quest (+10 bonus on top of the normal
completion award), processing a Brain Dump entry (+5, once per entry), starting a focus session
(+5, rate-limited to avoid rapid-restart spam), resuming a task with a second focus session (+5,
once per assignment), and two once-per-day planning actions — a daily check-in (`/api/activity/
checkin`, fired once when Home mounts) and reviewing upcoming work (`/api/activity/
review-upcoming`, fired once when Calendar's Upcoming tab opens). Six new achievements recognize
these behaviors (`Sorted It Out`, `Planner Pro`, `Step by Step`, `Small Wins`, `Looking Ahead`,
`Back on Track`); two of the brief's suggested achievements ("Getting Organized" for organizing,
"Breaking It Down" for breaking down) already existed with different meanings (adding 5 assignments;
completing a multi-step quest) and were kept as-is rather than silently redefined. Celebration
toasts (`context/CelebrationContext.tsx`) now pick from small pools of varied phrasing per context
instead of one fixed string, so the same action doesn't show identical copy every time. A "Your
Progress" strip on the Rewards page shows five positive-milestone counts, computed on demand from
existing tables (no new counter table, same philosophy as the XP ledger itself).

### 3. What Should I Do Now? (Rescue Mode)

`server/src/lib/recommend.ts` scores candidates (incomplete assignment steps, whole assignments,
unsorted Brain Dump entries) on urgency (overdue/today/tomorrow/this week), effort (small estimates
score higher, a large assignment with no steps is penalized toward "needs breaking down" rather
than recommended whole), whether the student already started it, and priority — so it does not
simply chase the closest deadline. `RecommendationHistory` records what was shown, whether it was
accepted/dismissed (so "Show Me Another" never immediately repeats a dismissed item) and, best-
effort, whether it was later completed. The dedicated `components/RescueSheet.tsx` offers one
recommendation at a time with a plain-language reason, "Give Me Something Easier" (filters to short
tasks, falling back to a small organizational win — add a due date, organize one Brain Dump entry,
check off one backpack item — never schoolwork invented to fill the slot), "Show Me Another,"
"Break This Assignment Down" (reuses the existing `QuestDetailSheet`'s suggest-steps flow directly
— no separate breakdown UI), and "I Need a Short Break." Accepting a schoolwork recommendation
navigates to `/focus` with router state that auto-starts a session pre-filled with that assignment
and a duration clamped to the existing 5/10/15/20-minute presets; accepting a Brain Dump
recommendation performs its suggested conversion immediately. With nothing outstanding, it shows a
positive "You're all caught up!" state with optional shortcuts — never an invented task.

## What's implemented

**Phase 1 (MVP), fully working:**
Dashboard with greeting/XP/avatar/Next Up/today's quests/progress ring; quick-add (title required,
everything else optional, a few taps); subjects with color + icon; Today/This Week/Upcoming
chronological views plus an optional month grid; overdue shown as a calm "catch up" section, never
red alarm styling; quest completion and step breakdown; a manual "Suggest steps" template generator
per subject/keyword (see below); focus timer with 5/10/15/20-minute presets, pause/stop, and a
completion screen that always awards XP for real effort, not just a perfect finish; XP ledger,
levels, and achievements; responsive layout tested at phone/tablet/desktop widths;
`prefers-reduced-motion` respected globally.

**Phase 2, also implemented:**
Avatar customization + Reward Store (stars currency, equip-by-category); daily routines (morning /
after-school / evening) with per-day completion; backpack checklist with a "reset for tomorrow"
button; a broader achievement set; in-app reminder toasts plus opt-in browser `Notification` API
support (polls every 60s, dismisses each reminder server-side after it fires once, so nothing nags
twice); and the full Brain Dump / process-rewards / "What Should I Do Now?" feature set described
below under [Executive-function enhancements](#executive-function-enhancements).

**Explicitly not implemented (Phase 3, documented as future work):**
Real AI-powered breakdown or natural-language quest entry (the "Suggest steps" feature today is a
deterministic, keyword/subject-based template generator in
`server/src/lib/stepSuggestions.ts` — swapping in a real AI call later means changing the inside of
that one function, not its callers, and the app must keep working if that call is ever
unavailable); Google Classroom / LMS sync; parent/teacher portals; true push notifications (today's
browser-notification polling is the seam to replace with a push service); calendar sync.

## Privacy notes

No diagnosis disclosure anywhere in the data model or UI copy — this is an organizational tool, not
a medical one. No advertising, behavioral tracking, or public leaderboards. The only account field
is a display name; profile switching has no password because the primary deployment context is a
single shared or personal device, not a multi-tenant public login.

## Known limitations

- Reminder preference toggles (Settings) are stored in `localStorage`, not the database — they're
  per-device UI preferences for now. A server-backed `Preference` model would be a small addition.
- Single-timezone assumption: due dates are computed in the server's local time. Fine for a single
  school's deployment; a multi-timezone future would move "day bucket" computation to the client.
- No automated test suite yet — verification so far is manual (see below) plus full TypeScript
  strict-mode checks on both workspaces.
- The live Railway demo reseeds on every restart (see [Live demo](#live-demo-railway)) and has no
  password auth — don't put real student data in it. A real deployment would drop the auto-seed
  from `npm start`, add real authentication, and likely move off a single SQLite file on a volume
  to Postgres (one `railway add --database postgres` plus a `DATABASE_URL` swap, no code changes
  needed beyond the Prisma `datasource` provider).
- The recommendation engine's scoring weights are hand-picked heuristics, not tuned against real
  usage data — reasonable starting points, documented inline in `lib/recommend.ts`, expected to need
  adjustment once real students use it.
- "Reviewing tomorrow's responsibilities" (one of the brief's suggested reward categories) wasn't
  given its own trigger — it's folded into the existing evening routine's "Check tomorrow's
  schedule" item, which already covers the same behavior via `ROUTINE_ITEM` rewards.

## Verification performed

- `npm run typecheck` (both workspaces) and `npm run build` (both workspaces) pass clean.
- Manually exercised in a real browser against the live API: profile creation/login, quick-add with
  every field combination, step breakdown + suggest-steps, completing quests/steps/focus
  sessions/routines and watching XP/level/achievements update live, purchasing and equipping a
  reward item and seeing the avatar change, converting a Brain Dump entry into a quest, rescheduling
  a quest from the Calendar view, Today/This Week/Upcoming/Month views, and a full page reload to
  confirm persistence survives (real SQLite file, not in-memory state).
- Checked responsive layout at 375px (phone) and desktop widths.
- Brain Dump: captured entries from the global FAB on a non-Settings page and from the dedicated
  page; converted one entry of each type (assignment/reminder/calendar/checklist/note) and confirmed
  each appears correctly in its destination feature; confirmed Unsorted/Processed are visually
  distinct and survive a full page reload; confirmed the heuristic "Help me organize these"
  suggestions match the entry text.
- Process rewards: fired every new XP action at least once and confirmed its matching achievement
  unlocks at the right threshold; confirmed editing the same field twice (e.g. setting a due date,
  then changing it again) only grants XP once; fired 5 concurrent requests at a once-per-day reward
  and confirmed exactly one was credited (the race-condition test that caught and fixed the
  find-then-create bug described above).
- What Should I Do Now?: confirmed it does not simply chase the closest deadline (an overdue short
  task outranked a sooner-but-longer one); exercised "Give Me Something Easier" (picked a smaller
  task), "Show Me Another" (never immediately repeated the dismissed item), "Break This Assignment
  Down" (opened the existing step-breakdown flow), and the accept → auto-started focus session path
  end to end, including the resulting XP award; cleared all active quests and Brain Dump entries and
  confirmed the positive "all caught up" state instead of an invented task.
