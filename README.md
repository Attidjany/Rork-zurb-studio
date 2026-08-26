# ZURB Studio — Zenoàh Urban Design Studio

Housing-development planning app (projects → sites → blocks/half-blocks/units → financial scenarios
with gold-indexed construction costs). Expo / React Native app exported to the web, with its own
Node + MySQL backend. Hosted on Cloudways (no Vercel, no Supabase).

```
expo/     the app (Expo Router, React Native Web). `npm run build:web` → expo/dist
server/   the API (Hono + mysql2). `npm run build` → server/dist/index.js (single bundle)
deploy/   Cloudways deploy script + public_html assets (.htaccess, proxy.php)
legacy/   the old Supabase SQL migrations and Rork-era docs, kept for reference
```

## Run locally
```
# API (needs a MySQL 8 database, see server/.env.example)
cd server && npm install && cp .env.example .env && npm run dev

# App (web)
cd expo && npm install && npm run web
```
With `STATIC_DIR=../expo/dist` in `server/.env` the API also serves the exported web app.

## Architecture notes
* `expo/lib/supabase.ts` keeps the `supabase.from(...).select().eq()` call surface the app was written
  against, but talks to `/api/db/:table/{select,insert,update,delete}`. Row-level security is enforced
  server-side through the table registry (`server/src/registry.ts`): every table resolves to its owner.
* Postgres triggers moved to `server/src/hooks.ts` (project defaults, block generation, scenario
  parameter copy, auto-scenarios) and `server/src/autoScenarios.ts`.
* Realtime is emulated: every mutation response lists the tables it changed and the client re-runs
  the matching loaders (plus a refresh when the tab regains focus).
* AI scenario generation uses the Anthropic SDK (`server/src/ai.ts`, model via `ANTHROPIC_MODEL`).
* Deploy: see `deploy/README.md`.
