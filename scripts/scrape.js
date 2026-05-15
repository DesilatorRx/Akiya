// Phase 2 nightly scraper runner.
//
//   node scripts/scrape.js              full run: scrape -> upsert Supabase
//   DRY_RUN=1 node scripts/scrape.js    scrape only, print rows, no DB
//
// Env (DB writes only; never client-side, never committed):
//   SUPABASE_URL                project URL
//   SUPABASE_SERVICE_ROLE_KEY   service_role key (bypasses RLS for writes)
//
// Respects low frequency (nightly via GitHub Actions). Each source's stale
// rows (not seen this run) are flagged active=false rather than deleted, so
// history is preserved and the site simply stops showing them.

/* eslint-disable no-console */
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { SOURCE as IIYAMA, scrapeIiyama } from './scrapers/iiyama.js';
import { makeAkiyaAthome } from './scrapers/akiyaAthome.js';

// Every akiya-athome municipality is just config — add a row to onboard one.
const ATHOME = [
  {
    source: 'tokamachi-city',
    base: 'https://tokamachi-c15210.akiya-athome.jp',
    cityJa: '十日町市',
    prefJa: '新潟県',
    prefEn: 'Niigata',
    cityEn: 'Tokamachi',
    locality: 'rural',
  },
  {
    source: 'kyoto-city',
    base: 'https://kyoto-c26100.akiya-athome.jp',
    cityJa: '京都市',
    prefJa: '京都府',
    prefEn: 'Kyoto',
    cityEn: 'Kyoto',
    locality: 'urban',
  },
  {
    source: 'takaishi-city',
    base: 'https://takaishi-c27225.akiya-athome.jp',
    cityJa: '高石市',
    prefJa: '大阪府',
    prefEn: 'Osaka',
    cityEn: 'Takaishi',
    locality: 'urban',
  },
].map(makeAkiyaAthome);

const SCRAPERS = [
  { source: IIYAMA, run: scrapeIiyama },
  ...ATHOME.map((x) => ({ source: x.SOURCE, run: () => x.scrape() })),
];

const DRY_RUN = process.env.DRY_RUN === '1';

async function main() {
  const browser = await chromium.launch();
  const bySource = {};

  try {
    for (const s of SCRAPERS) {
      try {
        const rows = await s.run(browser);
        bySource[s.source] = rows;
        console.log(`[${s.source}] scraped ${rows.length} listings`);
      } catch (e) {
        console.error(`[${s.source}] FAILED: ${e.message}`);
      }
    }
  } finally {
    await browser.close();
  }

  const all = Object.values(bySource).flat();

  if (DRY_RUN) {
    console.log(JSON.stringify(all, null, 2));
    console.log(`\nDRY_RUN: ${all.length} rows, nothing written.`);
    return;
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      'Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. ' +
        'Run with DRY_RUN=1 to test scraping without a database.'
    );
    process.exitCode = 1;
    return;
  }

  const db = createClient(url, key, { auth: { persistSession: false } });

  for (const [source, rows] of Object.entries(bySource)) {
    if (rows.length === 0) {
      console.warn(`[${source}] 0 rows — skipping upsert (no stale sweep).`);
      continue;
    }

    // rows carry exactly the table columns (source_url is now one of them;
    // scrapers already delete the _addressJa geocoding helper).
    const payload = rows;

    const { error } = await db
      .from('listings')
      .upsert(payload, { onConflict: 'source,source_id' });
    if (error) {
      console.error(`[${source}] upsert error: ${error.message}`);
      continue;
    }

    // Flag rows from this source not seen this run as inactive.
    const seen = rows.map((r) => r.source_id);
    const { error: staleErr, count } = await db
      .from('listings')
      .update({ active: false }, { count: 'exact' })
      .eq('source', source)
      .eq('active', true)
      .not('source_id', 'in', `(${seen.map((s) => `"${s}"`).join(',')})`);
    if (staleErr) {
      console.error(`[${source}] stale sweep error: ${staleErr.message}`);
    }
    console.log(
      `[${source}] upserted ${payload.length}, deactivated ${count ?? 0} stale`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
