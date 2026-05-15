// Reusable scraper for any municipal bank on the akiya-athome.jp platform.
// Every *-cNNNNN.akiya-athome.jp site shares one structure:
//   - /buy/house/list serves all sale houses in the initial HTML (the SPA
//     then mutates the DOM, so plain fetch() — not Playwright — is right)
//   - photo/blurb CARDS delimited by title anchors
//   - a results TABLE whose <tr> carry price / 間取り / 面積 ("建物 / 土地")
// Both regions key off the same /bukken/detail/buy/...-<id>.
//
// Address is extracted generically from the card (prefecture-kanji
// anchored), so NO per-city config is needed. Geocoding is done once per
// municipality (city-level), not per listing — accurate enough for radius
// search and respects Nominatim's bulk policy at scale.
//
// makeAkiyaAthome(cfg) -> { SOURCE, scrape }. cfg: { source, base,
// prefEn, cityEn, locality }.

import { geocode } from '../lib/geocode.js';
import { getPopulation } from '../lib/population.js';

function detag(s) {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseYen(text) {
  const man = (text || '').match(/([\d,]+(?:\.\d+)?)\s*万円/);
  if (man) return Math.round(parseFloat(man[1].replace(/,/g, '')) * 10_000);
  const yen = (text || '').match(/([\d,]+)\s*円/);
  return yen ? parseInt(yen[1].replace(/,/g, ''), 10) : 0;
}

function parseBedrooms(layout) {
  const m = (layout || '').match(/(\d+)\s*[SLDK]/);
  return m ? parseInt(m[1], 10) : null;
}

function yearFromAge(text) {
  const m = (text || '').match(/築\s*(\d+)\s*年/);
  return m ? new Date().getFullYear() - parseInt(m[1], 10) : null;
}

function mapCondition(text) {
  if (/解体|取壊|取り壊|更地/.test(text)) return 'tear-down';
  if (/リフォーム済|改装済|そのまま|良好/.test(text)) return 'move-in';
  return 'needs-work';
}

function num(s) {
  const v = parseFloat(String(s).replace(/,/g, ''));
  return Number.isFinite(v) ? v : null;
}

// Match the exact 47 prefectures (not "any kanji + 県", which false-matches
// e.g. 小佐渡県立自然公園). cityKey = prefecture + city, for geocoding.
const JP_PREFS = [
  '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県',
  '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県',
  '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県',
  '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県',
  '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県',
  '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県',
  '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県',
];
const PREF_ALT = JP_PREFS.join('|');
// prefecture + everything up to (and including) the first 市/区/町/村,
// optionally a little more, stopping at rail/walk/paren noise.
const ADDR_RE = new RegExp(
  `(${PREF_ALT})([一-龥ァ-ヶぁ-ん々ー0-9０-９丁目番地\\- ]{1,30}?[市区町村]` +
    `[一-龥ァ-ヶぁ-ん々ー0-9０-９丁目番地\\-]{0,18})`
);
// Prefer a 市/区 ending (避け: the 町 inside names like 十日町市); fall
// back to 町/村 for town/village municipalities.
const CITY_SHI = new RegExp(`^(${PREF_ALT})(.+?[市区])`);
const CITY_CHO = new RegExp(`^(${PREF_ALT})(.+?[町村])`);

function extractAddress(text) {
  const stripped = text.replace(/【[^】]*】/g, ' ');
  const m = stripped.match(ADDR_RE);
  if (!m) return { full: null, cityKey: null };
  const full = `${m[1]}${m[2]}`.replace(/\s+/g, '').trim();
  const c = full.match(CITY_SHI) || full.match(CITY_CHO);
  return { full, cityKey: c ? `${c[1]}${c[2]}` : `${m[1]}` };
}

/** Pure parser. cfg: { source, base, prefEn, cityEn, locality }. */
export function parseAkiyaAthome(html, cfg) {
  const { source, base, prefEn, cityEn, locality } = cfg;

  // 1. Table data rows -> price / layout / area, keyed by detail id.
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  const table = new Map();
  let t;
  while ((t = trRe.exec(html))) {
    const tr = t[0];
    const idm = tr.match(/bukken\/detail\/buy\/[^"']*?-(\d+)/);
    const tds = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) =>
      detag(c[1])
    );
    if (!idm || tds.length < 4) continue;
    const cell = tds.join(' ');
    const price = parseYen(cell);
    const layout = (cell.match(/\b(\d+[SLDKR]{1,4})\b/) || [])[1] || null;
    const area = cell.match(
      /([\d,]+(?:\.\d+)?)\s*㎡\s*\/\s*([\d,]+(?:\.\d+)?)\s*㎡/
    );
    if (price <= 0 && !layout) continue;
    table.set(idm[1], {
      price,
      layout,
      size_m2: area ? num(area[1]) : null, // 建物面積 (building)
      land_m2: area ? num(area[2]) : null, // 土地面積 (land)
    });
  }

  // 2. Card windows (delimited by the title anchor) -> image/address/age.
  const cards = new Map();
  const aRe = /href="\/bukken\/detail\/buy\/[^"]*?-(\d+)"[^>]*>/g;
  let a;
  while ((a = aRe.exec(html))) {
    const id = a[1];
    if (cards.has(id)) continue;
    const win = html.slice(a.index, a.index + 1800);
    const text = detag(win);
    const { full, cityKey } = extractAddress(text);
    const img = (win.match(/\/\/img\.akiya-athome\.jp\/\?v=[^"'\s]+/) || [])[0];
    const blurb = (text.match(/([^。]{8,140}物件です。)/) || [, ''])[1] || '';
    cards.set(id, {
      image: img ? `https:${img}` : null,
      addr: full,
      cityKey,
      year: yearFromAge(text),
      blurb,
      cond: mapCondition(text),
    });
  }

  // 3. Join — only ids present in the table are real priced listings.
  const rows = [];
  for (const [id, d] of table) {
    const c = cards.get(id) || {};
    rows.push({
      source,
      source_id: id,
      id: `${source}:${id}`,
      title: `${cityEn} akiya ${id}${d.layout ? ` — ${d.layout}` : ''}`,
      prefecture: prefEn,
      city: cityEn,
      price: d.price,
      is_free: d.price <= 0,
      condition: c.cond || 'needs-work',
      locality,
      size_m2: d.size_m2,
      land_m2: d.land_m2,
      year_built: c.year ?? null,
      bedrooms: parseBedrooms(d.layout),
      lat: null,
      lng: null,
      image: c.image || null,
      population: null,
      description: `${c.addr || `${prefEn}, ${cityEn}`}. ${
        d.layout || ''
      }. ${c.blurb || ''}`.trim(),
      source_url: `${base}/bukken/detail/buy/-${id}`,
      _cityKey: c.cityKey || null,
    });
  }
  return rows;
}

export function makeAkiyaAthome(cfg) {
  const LIST = `${cfg.base}/buy/house/list`;
  return {
    SOURCE: cfg.source,
    async scrape() {
      const res = await fetch(LIST, {
        headers: {
          'User-Agent': 'akiya-portal/1.0 (+https://akiya-rho.vercel.app)',
        },
      });
      if (!res.ok) throw new Error(`${cfg.source} list HTTP ${res.status}`);
      const rows = parseAkiyaAthome(await res.text(), cfg);

      // Geocode ONCE per municipality (city-level), then apply to all of
      // its rows. ~1 Nominatim call per bank instead of per listing.
      const byCity = new Map();
      for (const r of rows) {
        const key = r._cityKey;
        if (key && !byCity.has(key)) byCity.set(key, null);
      }
      const pop = new Map();
      for (const key of byCity.keys()) {
        const g = await geocode(key, '');
        if (g) byCity.set(key, g);
        pop.set(key, await getPopulation(key));
      }
      for (const r of rows) {
        const g = r._cityKey ? byCity.get(r._cityKey) : null;
        if (g) {
          r.lat = g.lat;
          r.lng = g.lng;
        }
        if (r._cityKey) r.population = pop.get(r._cityKey) ?? null;
        delete r._cityKey;
      }
      return rows;
    },
  };
}
