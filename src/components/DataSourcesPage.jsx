import { C, serif, sans } from '../theme.js';

const COVERAGE = [
  ['Nagano', 'Iiyama, Saku, Ueda banks', 'Phase 2', 'High akiya density'],
  ['Niigata', 'Tokamachi, Joetsu banks', 'Phase 2', 'Snow country'],
  ['Kochi', 'Prefectural iju portal', 'Phase 2', 'Pro-migration'],
  ['Ehime', 'Yawatahama, Uchiko banks', 'Planned', 'Citrus region'],
  ['Tokushima', 'Miyoshi / Iya Valley', 'Planned', 'Famous akiya area'],
  ['Gifu', 'Gujo, Takayama banks', 'Planned', 'Historic towns'],
  ['Wakayama', 'Tanabe, Kumano banks', 'Planned', 'Kumano Kodo'],
  ['Oita', 'Beppu, Bungo-ono banks', 'Backlog', 'Onsen demand'],
  ['Kagoshima', 'Tarumizu, Kirishima', 'Backlog', 'Mild climate'],
  ['Hokkaido', 'Kutchan, Niseko area', 'Backlog', 'Ski rental'],
];

const codeBox = {
  background: C.navy,
  color: '#e8e8e8',
  borderRadius: 8,
  padding: 16,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 13,
  lineHeight: 1.6,
  overflowX: 'auto',
  whiteSpace: 'pre',
};

export default function DataSourcesPage() {
  return (
    <div>
      <h1 style={{ fontFamily: serif, color: C.navy, fontSize: 32 }}>
        Where the data comes from
      </h1>
      <p style={{ fontFamily: sans, color: C.muted, marginTop: 0, maxWidth: 720 }}>
        Phase 1 ships with curated demo listings. Phase 2 replaces them with a
        nightly aggregation pipeline that normalises hundreds of independent
        municipal akiya banks into one searchable, geo-indexed database.
      </p>

      <h2 style={{ fontFamily: serif, color: C.navy, marginTop: 32 }}>
        Aggregation architecture
      </h2>
      <div
        style={{
          background: C.white,
          border: `1px solid ${C.line}`,
          borderRadius: 10,
          padding: 20,
          fontFamily: sans,
          fontSize: 15,
          lineHeight: 1.7,
        }}
      >
        <ol style={{ margin: 0, paddingLeft: 20 }}>
          <li>
            <strong>Scrapers</strong> — one Playwright module per municipal
            bank under <code>/scripts/scrape.js</code>, run nightly by a
            GitHub Actions cron.
          </li>
          <li>
            <strong>Normalisation</strong> — raw rows mapped to the shared
            listing schema (price ¥, area m², condition, lat/lng, source URL).
          </li>
          <li>
            <strong>Geocoding</strong> — addresses resolved to coordinates and
            stored as PostGIS <code>geography(Point)</code> for radius search.
          </li>
          <li>
            <strong>Upsert to Supabase</strong> — deduplicated on
            <code>(source, source_id)</code>; stale rows flagged inactive.
          </li>
          <li>
            <strong>Serve</strong> — the React client queries Supabase
            directly (anon key, row-level security) instead of the static
            array.
          </li>
        </ol>
      </div>

      <h2 style={{ fontFamily: serif, color: C.navy, marginTop: 32 }}>
        Example: scraper → normalised row
      </h2>
      <div style={codeBox}>
{`// scripts/scrape.js (Phase 2 sketch)
import { chromium } from 'playwright';

export async function scrapeIiyama() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://www.city.iiyama.lg.jp/akiya/');

  const rows = await page.$$eval('.akiya-item', (els) =>
    els.map((el) => ({
      sourceId: el.dataset.id,
      title:   el.querySelector('.title')?.textContent?.trim(),
      priceYen: Number(
        el.querySelector('.price')?.textContent?.replace(/[^0-9]/g, '')
      ),
      address: el.querySelector('.addr')?.textContent?.trim(),
    }))
  );

  await browser.close();
  return rows.map((r) => ({
    source: 'iiyama-city',
    source_id: r.sourceId,
    title: r.title,
    price: r.priceYen || 0,
    is_free: !r.priceYen,
    raw_address: r.address,
  }));
}`}
      </div>

      <h2 style={{ fontFamily: serif, color: C.navy, marginTop: 32 }}>
        Example: PostGIS radius query
      </h2>
      <div style={codeBox}>
{`-- listings within 25 km of a point, cheapest first
select id, title, price,
       st_distance(geo, st_point(:lng, :lat)::geography) as meters
from   listings
where  active
  and  st_dwithin(geo, st_point(:lng, :lat)::geography, 25000)
order  by price asc, meters asc;`}
      </div>

      <h2 style={{ fontFamily: serif, color: C.navy, marginTop: 32 }}>
        Coverage roadmap
      </h2>
      <div
        style={{
          background: C.white,
          border: `1px solid ${C.line}`,
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: sans,
            fontSize: 14,
          }}
        >
          <thead>
            <tr style={{ background: C.navy, color: C.gold, textAlign: 'left' }}>
              <th style={{ padding: 12 }}>Prefecture</th>
              <th style={{ padding: 12 }}>Sources targeted</th>
              <th style={{ padding: 12 }}>Status</th>
              <th style={{ padding: 12 }}>Note</th>
            </tr>
          </thead>
          <tbody>
            {COVERAGE.map((r, i) => (
              <tr
                key={r[0]}
                style={{
                  background: i % 2 ? C.cream : C.white,
                  borderTop: `1px solid ${C.line}`,
                }}
              >
                <td style={{ padding: 12, fontWeight: 700, color: C.navy }}>
                  {r[0]}
                </td>
                <td style={{ padding: 12 }}>{r[1]}</td>
                <td style={{ padding: 12 }}>
                  <span
                    style={{
                      background:
                        r[2] === 'Phase 2'
                          ? '#2e7d32'
                          : r[2] === 'Planned'
                          ? '#bc7a2e'
                          : C.muted,
                      color: C.white,
                      padding: '2px 10px',
                      borderRadius: 999,
                      fontSize: 12,
                    }}
                  >
                    {r[2]}
                  </span>
                </td>
                <td style={{ padding: 12, color: C.muted }}>{r[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p
        style={{
          fontFamily: sans,
          color: C.muted,
          fontSize: 13,
          marginTop: 24,
        }}
      >
        Scraping respects each site's robots.txt and runs at low frequency
        (nightly). Source URLs are preserved on every listing so buyers always
        transact with the originating municipality, not this portal.
      </p>
    </div>
  );
}
