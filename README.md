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
- `GET/POST /api/checklist`, `/api/braindump`, `/api/calendar-events`, `/api/reminders`

### Frontend pages

`Home` (dashboard) · `MyQuests` · `Calendar` · `Focus` · `Rewards` · `Settings` — matching the nav
the spec asked for. Backpack checklist and Brain Dump live inside Settings rather than getting
their own nav items, to keep the primary navigation short.

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
button; Brain Dump with one-tap "make it a quest" conversion; a broader achievement set; in-app
reminder toasts plus opt-in browser `Notification` API support (polls every 60s, dismisses each
reminder server-side after it fires once, so nothing nags twice).

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

## Verification performed

- `npm run typecheck` (both workspaces) and `npm run build` (both workspaces) pass clean.
- Manually exercised in a real browser against the live API: profile creation/login, quick-add with
  every field combination, step breakdown + suggest-steps, completing quests/steps/focus
  sessions/routines and watching XP/level/achievements update live, purchasing and equipping a
  reward item and seeing the avatar change, converting a Brain Dump entry into a quest, rescheduling
  a quest from the Calendar view, Today/This Week/Upcoming/Month views, and a full page reload to
  confirm persistence survives (real SQLite file, not in-memory state).
- Checked responsive layout at 375px (phone) and desktop widths.
