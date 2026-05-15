import { C, serif, sans } from '../theme.js';

const COVERAGE = [
  ['Niigata', 'Sado, Sanjō, Tōkamachi, Nagaoka, Niigata +', 'Live', 'Snow country'],
  ['Ehime', 'Seiyō, Saijō, Imabari, Yawatahama, Iyo +', 'Live', 'Setouchi coast'],
  ['Akita', 'Ōdate, Noshiro, Daisen, Yokote +', 'Live', 'Northern Tōhoku'],
  ['Gifu', 'Nakatsugawa, Takayama, Hida, Seki +', 'Live', 'Historic towns'],
  ['Ōita', 'Ōita, Usuki, Hita, Yufu +', 'Live', 'Onsen region'],
  ['Kumamoto', 'Uki, Yatsushiro, Arao, Uto +', 'Live', 'Kyūshū west'],
  ['Kagoshima', 'Shibushi, Makurazaki, Ichikikushikino +', 'Live', 'Mild climate'],
  ['Nagano', 'Iiyama, Nakano', 'Live', 'High akiya density'],
  ['Others', 'Kyoto, Osaka, Shimane, Kōchi, Wakayama, Miyagi…', 'Live', 'Expanding'],
];

export default function DataSourcesPage() {
  return (
    <div>
      <h1 style={{ fontFamily: serif, color: C.navy, fontSize: 32 }}>
        Where the data comes from
      </h1>
      <p style={{ fontFamily: sans, color: C.muted, marginTop: 0, maxWidth: 720 }}>
        Every listing is aggregated nightly from official municipal akiya
        banks across Japan and normalised into one searchable, map-indexed
        database. We don't sell property — each listing links straight back
        to the originating town's own akiya bank, where you transact.
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
        Coverage
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
