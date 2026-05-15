# Akiya Japan Portal

A property-listing portal for Japanese **akiya** (空き家 — vacant/abandoned
houses), aimed at English-speaking foreign buyers.

## Stack

- Vite + React (plain JS, no TypeScript)
- Supabase (Postgres + PostGIS) — wired for Phase 2
- Vercel hosting + Edge Function (`/api/chat.js`)
- Anthropic API (Claude) for the AI advisor & letter generator
- Google Fonts: Noto Serif JP + DM Sans (injected at runtime)

## Local setup

```bash
npm install
cp .env.example .env   # fill in keys
npm run dev            # http://localhost:5173
```

The AI features call `/api/chat`, a Vercel Edge Function. Locally that route
only runs under `vercel dev` (install the Vercel CLI). Without it the UI works
fully on demo data; AI calls will just show an error message.

```bash
npm i -g vercel
vercel dev
```

## Environment variables

| Var                     | Where        | Purpose                          |
| ----------------------- | ------------ | -------------------------------- |
| `ANTHROPIC_API_KEY`     | server only  | Claude API, proxied by /api/chat |
| `VITE_SUPABASE_URL`     | client       | Supabase project URL (Phase 2)   |
| `VITE_SUPABASE_ANON_KEY`| client       | Supabase anon key (Phase 2)      |

## Structure

```
api/chat.js              Vercel Edge Function — Anthropic proxy
src/App.jsx              Font injection + react-router routes
src/theme.js             Shared palette + font stacks
src/lib/supabase.js      Supabase singleton (Phase 2)
src/lib/taxes.js         calcTax(), yen/usd/sqft formatters
src/data/listings.js     10 demo properties (Phase 1)
src/data/prefectures.js  47 prefectures + agent directory
src/components/          One file per page/feature
scripts/scrape.js        Phase 2 nightly scraper (placeholder)
```

## Features (Phase 1)

1. **Listings** — demo properties, filters (price/free/condition/prefecture)
2. **Property modal** — sq ft conversion, inline tax estimator, AI advisor
3. **Get Started** — 8-step buying guide, AI letter generator (JP/EN),
   all 47 prefecture akiya-bank links, bilingual agent directory
4. **Data Sources** — aggregation architecture, code examples, coverage table

## Phase 2

Done:

- ✅ Listings served from Supabase (`src/lib/listings.js`), demo-array fallback
- ✅ Schema + PostGIS + RLS migrations (`supabase/migrations/`)
- ✅ Rate limiting + input caps on `/api/chat`
- ✅ First Playwright scraper (Iiyama City) + nightly GitHub Actions cron

Remaining:

- More municipal bank scrapers (one module per `scripts/scrapers/`)
- Geocoding (scraped rows currently have null lat/lng → excluded from radius search)
- PostGIS radius-search UI ("within X km")

### Scraper

```bash
# Scrape only, print normalized rows, no DB writes — safe to run anytime:
DRY_RUN=1 npm run scrape

# Full run (needs Chromium + Supabase service_role key):
npx playwright install chromium
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run scrape
```

Each scraper lives in `scripts/scrapers/<bank>.js` and exports a pure
`parseDetail(html, url)` (unit-testable without a browser) plus a
Playwright-driven `scrape<Bank>(browser)`. The runner (`scripts/scrape.js`)
upserts on `(source, source_id)` and flags rows not seen this run
`active=false` (never deletes — preserves history).

**GitHub Actions:** `.github/workflows/scrape.yml` runs nightly (03:00 JST).
Add repo secrets `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
(Settings → Secrets and variables → Actions). The `service_role` key
bypasses RLS for writes — **repo secret only, never client-side.**

## Disclaimers

All figures are estimates. Japanese property tax modelling (Fixed Asset Tax
1.4%/yr, City Planning Tax ≤0.3%/yr, assessed-value ratios) is approximate —
verify with the relevant municipality and a licensed professional before
transacting.
