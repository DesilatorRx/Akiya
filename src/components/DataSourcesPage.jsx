import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { C, serif, sans } from '../theme.js';
import { PREFECTURES_47 } from '../data/prefectures.js';

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

// Honest, buyer-relevant context for each note (what it means for you).
const NOTE_INFO = {
  'Snow country':
    'Heavy-snow region (豪雪地帯). Homes are built for snow load with ' +
    'steep or reinforced roofs; budget for winter heating and snow ' +
    'clearing. Inland Niigata and northern Nagano can get several ' +
    'metres of snow a year.',
  'Setouchi coast':
    'The calm Seto Inland Sea side of Ehime — mild, low rainfall, and ' +
    'citrus country. Popular for relocation and small guesthouses; many ' +
    'towns are walkable to the water.',
  'Northern Tōhoku':
    'Cold winters and steep depopulation in Akita mean unusually cheap ' +
    '(often near-free) akiya — but expect smaller local services and ' +
    'thinner resale/rental demand.',
  'Historic towns':
    'Gifu’s Takayama / Hida area has preserved townscapes and strong ' +
    'tourism (good guesthouse potential), though heritage districts can ' +
    'carry renovation restrictions.',
  'Onsen region':
    'Ōita (Beppu, Yufu) is Japan’s hot-spring heartland — steady ' +
    'tourism and short-stay rental demand; some properties even carry ' +
    'onsen water rights.',
  'Kyūshū west':
    'Kumamoto — mild climate, active farmland and rich volcanic soil, ' +
    'with land prices well below main-island averages.',
  'Mild climate':
    'Kagoshima is warm with a long growing season (great for gardening ' +
    'and farming) but sits in a typhoon path — scrutinise roof and ' +
    'structural condition.',
  'High akiya density':
    'Nagano (Iiyama) has among Japan’s highest vacancy rates plus active ' +
    'municipal migration support — lots of choice and relocation ' +
    'incentives.',
  'Expanding':
    'Coverage grows automatically as more municipal akiya-bank sites are ' +
    'onboarded (Kyoto, Osaka, Shimane, Kōchi, Wakayama, Miyagi and more).',
};

// English prefecture name -> its national akiya-bank search page.
const BANK_URL = Object.fromEntries(
  PREFECTURES_47.map((p) => [p.en, p.bankUrl])
);

export default function DataSourcesPage() {
  const [open, setOpen] = useState(null); // expanded note row index

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
            {COVERAGE.map((r, i) => {
              const [pref, sources, status, note] = r;
              const isOther = pref === 'Others';
              const to = isOther
                ? '/'
                : `/?prefecture=${encodeURIComponent(pref)}`;
              return (
                <Fragment key={pref}>
                  <tr
                    style={{
                      background: i % 2 ? C.cream : C.white,
                      borderTop: `1px solid ${C.line}`,
                    }}
                  >
                    <td style={{ padding: 12, fontWeight: 700 }}>
                      <Link
                        to={to}
                        title={`Browse ${pref} listings`}
                        style={{ color: C.red, textDecoration: 'none' }}
                      >
                        {pref} ↗
                      </Link>
                    </td>
                    <td style={{ padding: 12 }}>{sources}</td>
                    <td style={{ padding: 12 }}>
                      <span
                        style={{
                          background: '#2e7d32',
                          color: C.white,
                          padding: '2px 10px',
                          borderRadius: 999,
                          fontSize: 12,
                        }}
                      >
                        {status}
                      </span>
                    </td>
                    <td style={{ padding: 12 }}>
                      <button
                        onClick={() => setOpen(open === i ? null : i)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: C.navy,
                          fontFamily: sans,
                          fontSize: 14,
                          cursor: 'pointer',
                          padding: 0,
                          textDecoration: 'underline',
                          textUnderlineOffset: 3,
                        }}
                        aria-expanded={open === i}
                      >
                        {note} {open === i ? '▲' : '▼'}
                      </button>
                    </td>
                  </tr>
                  {open === i && (
                    <tr style={{ background: C.cream }}>
                      <td
                        colSpan={4}
                        style={{
                          padding: '4px 16px 16px',
                          fontFamily: sans,
                          fontSize: 14,
                          color: C.ink,
                          lineHeight: 1.6,
                        }}
                      >
                        {NOTE_INFO[note] || ''}
                        <div style={{ marginTop: 8 }}>
                          <Link
                            to={to}
                            style={{ color: C.red, fontWeight: 700 }}
                          >
                            Browse {isOther ? 'all' : pref} listings →
                          </Link>
                          {!isOther && BANK_URL[pref] && (
                            <>
                              {'  ·  '}
                              <a
                                href={BANK_URL[pref]}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: C.red, fontWeight: 700 }}
                              >
                                {pref}’s official akiya bank ↗
                              </a>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
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
