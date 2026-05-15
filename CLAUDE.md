# CLAUDE.md — Akiya Japan Portal

Project context for AI coding sessions. Keep this current when architecture changes.

## What this is

A property-listing portal for Japanese **akiya** (空き家 — vacant/abandoned houses), aimed at English-speaking foreign buyers. Built by Jordan, deployed on Vercel.

- **Repo:** github.com/DesilatorRx/Akiya (push to `main` → Vercel auto-deploys)
- **Live:** https://akiya-rho.vercel.app (the `*-projects.vercel.app` aliases 401 — that's Vercel Deployment Protection, expected; `akiya-rho` is the public domain)

## Stack

- Vite + React (**plain JS — no TypeScript**)
- Supabase (Postgres + PostGIS) — live, project ref `jzptcllnmipxroifgrqb`
- Vercel hosting + Edge Function (`/api/chat.js`)
- Anthropic API (Claude `claude-sonnet-4-6`) for the AI advisor + letter generator

## Hard constraints (do not violate)

- **No TypeScript.** Plain `.js`/`.jsx` only.
- **No Tailwind.** All styles are inline style objects; shared palette in `src/theme.js`.
- **No router.** Single page; tab navigation via `useState` in `App.jsx`.
- Fonts (Noto Serif JP + DM Sans) injected via runtime `<link>` in `App.jsx`, not committed CSS.

## Layout

```
api/chat.js              Edge Function — Anthropic proxy + in-memory rate limiting
src/App.jsx              Font injection + tab nav
src/theme.js             Palette (navy #0d1f3c, red #bc2e2e, cream #f5f0e8, gold #e8d5a3) + font stacks
src/lib/supabase.js      Supabase singleton (no-throw; isSupabaseConfigured guard)
src/lib/listings.js      getListings() — Supabase query + demo-array fallback, snake_case→camelCase
src/lib/taxes.js         calcTax(), yen/usd/sqft formatters (¥155/USD)
src/data/listings.js     10 demo listings (fallback data; mirrors seed SQL)
src/data/prefectures.js  47 prefectures + agent directory
src/components/          One file per page/feature
supabase/migrations/     0001 schema (table+PostGIS+RLS), 0002 seed demo
scripts/scrape.js        Phase 2 scraper entrypoint
```

## Data model

`public.listings` — RLS enabled. Anon/publishable key may **SELECT only `active=true`** rows; it cannot write. Writes (scraper) require the **service_role key** (bypasses RLS). `geo geography(Point)` is auto-derived from `lat`/`lng` by a trigger. Demo rows are tagged `source='demo'`; scraped rows use the bank slug. Clean demo data with `delete from public.listings where source='demo';`.

UI shape is camelCase (`isFree`, `sizeM2`, `yearBuilt`); DB is snake_case. `src/lib/listings.js#fromRow` is the only mapping point — keep it the single source of truth.

## Conventions

- Prices: JPY, displayed `¥` with `~$USD` at ¥155/USD. `0` = free akiya (skips acquisition costs in `calcTax`).
- Sizes: stored m², displayed sq ft with m² in parens.
- Tax model (approximate, disclaimed): Fixed Asset 1.4%/yr, City Planning ≤0.3%/yr, assessed-value ratio 50% rural / 70% typical / 90% urban.
- Always keep the demo-array fallback working — the site must never hard-fail if Supabase is down.

## Environment variables

Set in Vercel as **Sensitive** (so `vercel env pull` returns empty — values inject only at build/runtime; for local dev paste them into `.env.local` manually).

| Var | Scope | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | server | Claude, proxied by `/api/chat` |
| `VITE_SUPABASE_URL` | client | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | client | publishable key (`sb_publishable_…`), safe in browser w/ RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | scraper only | **secret** — Phase 2 scraper writes; never client-side, never committed |

## Verifying the live data path

No DB creds needed: pull the public URL + publishable key out of the deployed bundle (`/assets/index-*.js`) and hit `…/rest/v1/listings?select=*&active=eq.true` with the `apikey` header — that's exactly what the browser does.

## Build / deploy

- `npm run dev` — UI only; `/api/chat` needs `vercel dev` or a deployment.
- `npm run build` — must pass before push (Vite doesn't compile `api/`; syntax-check Edge fns with `node --check api/chat.js`).
- Push to `main` auto-deploys to production. Verify behavior live, not just "deployed".

## Status

Phase 1 complete & deployed. Phase 2: Supabase wired + rate limiting done. Remaining: real scrapers, GitHub Actions nightly cron, PostGIS radius-search UI.
