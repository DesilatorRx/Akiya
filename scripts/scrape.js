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

// Prefecture English name by JIS 2-digit code (first 2 of the 5-digit
// code embedded in each akiya-athome subdomain, e.g. sado-c15224 -> 15).
const PREF_BY_CODE = {
  '01': 'Hokkaido', '02': 'Aomori', '03': 'Iwate', '04': 'Miyagi',
  '05': 'Akita', '06': 'Yamagata', '07': 'Fukushima', '08': 'Ibaraki',
  '09': 'Tochigi', '10': 'Gunma', '11': 'Saitama', '12': 'Chiba',
  '13': 'Tokyo', '14': 'Kanagawa', '15': 'Niigata', '16': 'Toyama',
  '17': 'Ishikawa', '18': 'Fukui', '19': 'Yamanashi', '20': 'Nagano',
  '21': 'Gifu', '22': 'Shizuoka', '23': 'Aichi', '24': 'Mie',
  '25': 'Shiga', '26': 'Kyoto', '27': 'Osaka', '28': 'Hyogo',
  '29': 'Nara', '30': 'Wakayama', '31': 'Tottori', '32': 'Shimane',
  '33': 'Okayama', '34': 'Hiroshima', '35': 'Yamaguchi', '36': 'Tokushima',
  '37': 'Kagawa', '38': 'Ehime', '39': 'Kochi', '40': 'Fukuoka',
  '41': 'Saga', '42': 'Nagasaki', '43': 'Kumamoto', '44': 'Oita',
  '45': 'Miyazaki', '46': 'Kagoshima', '47': 'Okinawa',
};

// Productive akiya-athome municipal banks (have sale houses on
// /buy/house/list). Onboarding more = add a subdomain string.
const ATHOME_SUBS = [
  'sado-c15224', 'sanjo-c15204', 'odate-c05204', 'seiyo-c38214',
  'saijo-c38206', 'imabari-c38202', 'oita-c44201', 'nakatsugawa-c21206',
  'yawatahama-c38204', 'fukushima-c07201', 'takayama-c21203',
  'uki-c43213', 'usuki-c44206', 'hita-c44204', 'hida-c21217',
  'ojiya-c15208', 'yatsushiro-c43202', 'shibushi-c46221', 'nagai-c06209',
  'tokamachi-c15210', 'noshiro-c05202', 'iyo-c38210', 'unnan-c32209',
  'yamagata-c06201', 'nagaoka-c15202', 'makurazaki-c46204', 'uto-c43211',
  'ichikikushikino-c46219', 'shikokuchuo-c38213', 'ishinomaki-c04202',
  'yufu-c44213', 'kinokawa-c30208', 'daisen-c05212', 'arao-c43204',
  'seki-c21205', 'matsue-c32201', 'tainai-c15227', 'aki-c39203',
  'susaki-c39206', 'kami-c39212', 'niigata-c15100', 'tajimi-c21204',
  'yuzawa-c05207', 'nakano-c20211', 'yokote-c05203', 'tome-c04212',
  'wakayama-c30201', 'kyoto-c26100', 'takaishi-c27225',
  // Sweep of all 47 prefectures (2026-05-16) — +97 productive municipal
  // banks (~+2,000 listings). akiya-athome template handles all of them.
  'kasaoka-c33205', 'fukui-c18201', 'kitakyushu-c40100', 'takaoka-c16202',
  'hirosaki-c02202', 'sakai-c18210', 'tsuyama-c33203', 'mihara-c34204',
  'ebino-c45209', 'miyoshi-c34209', 'mine-c35213', 'kiryu-c10203',
  'yanai-c35212', 'kasai-c28220', 'kurayoshi-c31203', 'imari-c41205',
  'miyako-c03202', 'nantan-c26213', 'hachinohe-c02203', 'toyama-c16201',
  'miyazaki-c45201', 'sanyo-c35216', 'mima-c36207', 'awara-c18208',
  'iwakuni-c35208', 'taku-c41204', 'kasama-c08216', 'kofu-c19201',
  'nishiwaki-c28213', 'tsugaru-c02209', 'hadano-c14211', 'miyoshi-c36208',
  'koka-c25209', 'uda-c29212', 'hirado-c42207', 'goshogawara-c02205',
  'oyabe-c16209', 'ono-c18205', 'hachimantai-c03214', 'nirasaki-c19207',
  'tomioka-c10210', 'hyuga-c45206', 'tsu-c24201', 'higashiomi-c25213',
  'hofu-c35206', 'naruto-c36202', 'toba-c24211', 'kuwana-c24205',
  'tahara-c23231', 'sasayama-c28221', 'kuji-c03207', 'iga-c24216',
  'shibukawa-c10208', 'sano-c09204', 'annaka-c10211', 'ogi-c41208',
  'makinohara-c22226', 'gamagori-c23214', 'iki-c42210', 'midori-c10212',
  'suzu-c17205', 'matsusaka-c24204', 'ashikaga-c09202', 'nasushiobara-c09213',
  'moka-c09209', 'odawara-c14206', 'mimasaka-c33215', 'ishioka-c08205',
  'nikko-c09206', 'takeo-c41206', 'higashimatsuyama-c11212', 'gose-c29208',
  'inuyama-c23215', 'ushiku-c08219', 'kamisu-c08232', 'chikusei-c08227',
  'shimotsuke-c09216', 'uozu-c16204', 'tsuru-c19204', 'gojo-c29207',
  'toyokawa-c23207', 'yonago-c31202', 'sanuki-c37206', 'yoshinogawa-c36205',
  'tsushima-c42209', 'tatebayashi-c10207', 'abiko-c12222', 'shimoda-c22219',
  'yokkaichi-c24202', 'kakogawa-c28210', 'morioka-c03201', 'isesaki-c10204',
  'yaizu-c22212', 'sakaiminato-c31204', 'tottori-c31201', 'matsuura-c42208',
  'isahaya-c42204',
];

function configFromSub(sub) {
  const m = sub.match(/^(.+)-c(\d{2})\d{3}$/);
  const slug = m ? m[1] : sub;
  const code = m ? m[2] : '00';
  const cityEn =
    slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');
  return {
    source: sub,
    base: `https://${sub}.akiya-athome.jp`,
    prefEn: PREF_BY_CODE[code] || 'Japan',
    cityEn,
    locality: 'rural',
  };
}

const ATHOME = ATHOME_SUBS.map(configFromSub).map(makeAkiyaAthome);

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
