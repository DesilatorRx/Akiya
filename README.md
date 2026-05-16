# Akiya Japan Portal

A property-listing portal for Japanese **akiya** (空き家 — vacant/abandoned
houses), aimed at English-speaking foreign buyers. Live, with **~1,500 real
listings** aggregated nightly from 50 municipal akiya-bank sites.

**Live:** https://akiya-rho.vercel.app

## Stack

- Vite + React (plain JS, no TypeScript), `react-router-dom`
- Supabase (Postgres + PostGIS) — **live**, all listing data served from it
- Vercel hosting + Edge Functions (`/api/*`)
- Anthropic API (Claude **Haiku 4.5**) for the AI advisor & letter generator
- Google Fonts: Noto Serif JP + DM Sans (injected at runtime)

## Local setup

```bash
npm install
cp .env.example .env   # fill in keys (PowerShell: copy .env.example .env)
npm run dev            # http://localhost:5173
```

`npm run dev` serves the SPA. Two notes:

- AI features (`/api/chat`) and the SEO functions (`/api/prerender`,
  `/api/sitemap`) only run under `vercel dev` or a real deployment.
- If `VITE_SUPABASE_*` aren't set, the UI shows an honest **"listings
  temporarily unavailable"** state — there is **no demo/fake data anywhere**.

```bash
npm i -g vercel
vercel dev
```

## Environment variables

| Var | Where | Purpose |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | Vercel (server) | Claude, proxied by `/api/chat` |
| `VITE_SUPABASE_URL` | Vercel (client) | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Vercel (client) | Supabase **publishable** key (`sb_publishable_…`); safe in-browser with RLS |
| `SUPABASE_URL` | GitHub Actions secret | scraper writes |
| `SUPABASE_SERVICE_ROLE_KEY` | GitHub Actions secret | scraper writes (bypasses RLS) — **never client-side** |

Vercel vars are set "Sensitive" (so `vercel env pull` returns empty; for
local dev paste them into `.env.local` manually).

## Structure

```
api/chat.js              Edge — Anthropic (Haiku) proxy + in-memory rate limiting
api/prerender.js         Edge — per-listing <title>/OG/JSON-LD for crawlers
api/sitemap.js           Edge — sitemap.xml from Supabase (paginated)
public/robots.txt        points crawlers at the sitemap
vercel.json              rewrites: sitemap, /listing -> prerender, SPA fallback

src/App.jsx              react-router routes + header/footer
src/theme.js             palette + font stacks
src/lib/supabase.js      Supabase singleton (no-throw)
src/lib/listings.js      getListings()/getListingsNear()/getListingById() (paginated)
src/lib/taxes.js         calcTax(), yen/usd/sqft formatters
src/lib/place.js         nearest-Shinkansen, nearest-coast, city population
src/lib/format.js        displayTitle() — human English titles from fields
src/lib/subscribe.js     email-alert signup insert
src/lib/leads.js         "help with this property" lead insert
src/lib/affiliates.js    single source of truth for affiliate URLs (Wise…)
src/data/listings.js     CONDITIONS enum only (no demo data)
src/data/prefectures.js  47 prefectures + bilingual agent directory
src/data/shinkansen.js   Shinkansen station coords
src/data/coastline.js    Japan coastline points (distance-to-sea)
src/components/          ListingsPage, ListingDetail, PropertyModal,
                         GetStartedPage, DataSourcesPage, SignupBar
scripts/scrape.js        nightly runner (Iiyama + 49 akiya-athome banks)
scripts/scrapers/        iiyama.js (Playwright) · akiyaAthome.js (fetch template)
scripts/lib/             geocode.js (Nominatim) · population.js (Wikidata)
supabase/migrations/     0001 schema … 0007 leads
```

## Features

- **Listings** — ~1,500 live properties; filters: price, condition,
  prefecture, near-a-city radius (PostGIS), square footage, distance to the
  sea (6 tiers incl. "walkable"), town size (population); result pagination.
- **Per-listing pages** — real shareable/indexable URLs
  (`/listing/:source/:id`), server-prerendered title/description/OG/JSON-LD.
- **Property detail** — sq ft conversion, interactive JP tax estimator, AI
  advisor (Claude), town population, nearest Shinkansen, Google Maps link,
  link back to the originating akiya bank, and a "get help with this
  property" lead-capture module.
- **Get Started** — 8-step buying guide, AI letter generator (JP/EN), all
  47 prefecture akiya-bank links, bilingual agent directory, money-transfer
  / inspection / scrivener services.
- **Data Sources** — plain-language sourcing explanation; interactive
  coverage table (click a prefecture → filtered listings; click a note →
  buyer-relevant context).
- **Email capture** — new-listing alert signup (`subscribers`, RLS
  insert-only).

## Data pipeline (scraper)

```bash
DRY_RUN=1 npm run scrape     # scrape only, print rows, no DB writes
# Full run needs Chromium + the SUPABASE_* env (see above):
npx playwright install chromium
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run scrape
```

- **`scripts/scrapers/iiyama.js`** — Playwright; pure `parseDetail(html,url)`
  (unit-testable) + `scrapeIiyama(browser)`.
- **`scripts/scrapers/akiyaAthome.js`** — reusable template for any
  `*-cNNNNN.akiya-athome.jp` bank (plain `fetch`, the platform serves the
  data in the initial HTML). `makeAkiyaAthome(cfg)`; onboarding a bank =
  add one subdomain string in `scripts/scrape.js`.
- Each municipality is **geocoded once** (Nominatim, city-level, cached)
  and its **population** fetched once (Wikidata, cached) — both bulk-safe.
- The runner upserts on `(source, source_id)` and flags rows not seen this
  run `active=false` (never deletes — preserves history).
- **GitHub Actions:** `.github/workflows/scrape.yml`, nightly 03:00 JST,
  Node 22. Repo secrets `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.

## Database migrations

Run in order in the Supabase SQL Editor. `0001` is the schema; `0002`/`0003`
are historical (demo seed then its removal — **the app ships no demo data**);
`0004`–`0007` add `source_url`, `population`, `subscribers`, `leads`.

## SEO

`sitemap.xml` (every active listing, paginated past Supabase's 1000-row
cap) + `robots.txt` + per-listing prerender. Submit the sitemap in Google
Search Console (URL-prefix property, HTML-tag verified).

## Disclaimers

All figures are estimates. Japanese property-tax modelling (Fixed Asset Tax
1.4%/yr, City Planning Tax ≤0.3%/yr, assessed-value ratios), distance-to-sea
and nearest-Shinkansen are approximations from town-level coordinates —
verify with the originating municipality and a licensed professional before
transacting. Listings link back to the source bank; this portal does not
broker sales.
