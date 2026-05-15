// Phase 2 — nightly akiya-bank scraper. NOT wired up yet.
//
// Plan:
//   - one async scrapeXxx() per municipal bank, returning normalised rows
//   - geocode raw_address -> { lat, lng }
//   - upsert into Supabase `listings` on (source, source_id)
//   - flag rows not seen this run as inactive
//
// Run nightly via GitHub Actions cron. Requires `playwright` (add in Phase 2):
//   npm i -D playwright && npx playwright install chromium
//
// Respect each site's robots.txt and keep frequency low (nightly).

/* eslint-disable no-console */

const SCRAPERS = [
  // { name: 'iiyama-city', run: scrapeIiyama },
];

async function main() {
  if (SCRAPERS.length === 0) {
    console.log(
      'No scrapers registered yet. This is a Phase 2 placeholder — see ' +
        'the Data Sources page for the intended architecture.'
    );
    return;
  }

  const all = [];
  for (const s of SCRAPERS) {
    try {
      const rows = await s.run();
      console.log(`[${s.name}] ${rows.length} rows`);
      all.push(...rows);
    } catch (err) {
      console.error(`[${s.name}] failed:`, err.message);
    }
  }

  // TODO Phase 2: geocode + upsert into Supabase here.
  console.log(`Total scraped: ${all.length} (upsert not yet implemented)`);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
