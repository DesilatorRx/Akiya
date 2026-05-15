// Tokamachi City (Niigata) akiya bank scraper.
//
// akiya-athome.jp platform (used by many municipalities — this parser is
// a reusable template for other *-athome.jp banks). The list page has two
// regions keyed by the same detail id:
//   - photo/blurb CARDS  (property-list-one): image, address, build-age
//   - results TABLE rows: price, 間取り, 面積 ("建物面積 / 土地面積")
// parseList() parses both and joins by id. Pure/testable.

import { geocode } from '../lib/geocode.js';

export const SOURCE = 'tokamachi-city';
const BASE = 'https://tokamachi-c15210.akiya-athome.jp';
const LIST =
  `${BASE}/buy/house/area/niigataken/tokamachishi/list?gyosei_cd%5B%5D=15210`;

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

/**
 * Pure parser: full list-page HTML -> array of normalized rows.
 * Joins the results-table data row (price/layout/area) to the photo card
 * (image/address/age) by the shared detail id.
 */
export function parseList(html) {
  // 1. Table data rows: a <tr> that contains a detail link AND <td> cells.
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  const table = new Map(); // id -> { price, layout, size_m2, land_m2 }
  let t;
  while ((t = trRe.exec(html))) {
    const tr = t[0];
    const idm = tr.match(/bukken\/detail\/buy\/[^"']*?-(\d+)/);
    const tds = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) =>
      detag(c[1])
    );
    if (!idm || tds.length < 4) continue; // skip the photo-only <tr>
    const cellText = tds.join(' ');
    const price = parseYen(cellText);
    const layout = (cellText.match(/\b(\d+[SLDKR]{1,4})\b/) || [])[1] || null;
    const area = cellText.match(
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

  // 2. Photo/blurb cards: window forward from each title anchor (all cards
  // live in one container, so split by the detail anchor, not the class).
  const cards = new Map(); // id -> { image, addr, year, blurb, cond }
  const aRe = /href="\/bukken\/detail\/buy\/[^"]*?-(\d+)"[^>]*>/g;
  let a;
  while ((a = aRe.exec(html))) {
    const id = a[1];
    if (cards.has(id)) continue;
    const win = html.slice(a.index, a.index + 1800);
    const text = detag(win);
    // Strip the 【新潟県十日町市】 title bracket, then take the locality
    // token that follows (e.g. 山本町5丁目 / 上川町 / 尾崎).
    const after = text.replace(/【[^】]*】/g, ' ');
    const loc =
      (after.match(/十日町市\s*([0-9０-９一-龯ぁ-んァ-ヶ丁目番地]+)/) || [])[1] ||
      '';
    const addr = `新潟県十日町市${loc}`.trim();
    const img = (win.match(/\/\/img\.akiya-athome\.jp\/\?v=[^"'\s]+/) || [])[0];
    const blurb = (text.match(/([^。]{8,140}物件です。)/) || [, ''])[1] || '';
    cards.set(id, {
      image: img ? `https:${img}` : null,
      addr,
      year: yearFromAge(text),
      blurb,
      cond: mapCondition(text),
    });
  }

  // 3. Join. Only ids present in the table are real, priced sale listings.
  const rows = [];
  for (const [id, d] of table) {
    const c = cards.get(id) || {};
    rows.push({
      source: SOURCE,
      source_id: id,
      id: `${SOURCE}:${id}`,
      title: `Tokamachi akiya ${id}${d.layout ? ` — ${d.layout}` : ''}`,
      prefecture: 'Niigata',
      city: 'Tokamachi',
      price: d.price,
      is_free: d.price <= 0,
      condition: c.cond || 'needs-work',
      locality: 'rural',
      size_m2: d.size_m2,
      land_m2: d.land_m2,
      year_built: c.year ?? null,
      bedrooms: parseBedrooms(d.layout),
      lat: null,
      lng: null,
      image: c.image || null,
      description:
        `${c.addr || '十日町市'}. ${d.layout || ''}. ${c.blurb || ''} `.trim() +
        ` Source: ${BASE}/bukken/detail/buy/-${id}`,
      source_url: `${BASE}/bukken/detail/buy/-${id}`,
      _addressJa: c.addr || '十日町市',
    });
  }
  return rows;
}

// akiya-athome serves the results table in the initial HTML response; its
// SPA hydration then mutates the DOM, so a headless browser's post-render
// content() loses the table. Plain fetch() of the server HTML is correct
// and lighter. (browser arg accepted for a uniform runner signature.)
export async function scrapeTokamachi(_browser) {
  const res = await fetch(LIST, {
    headers: { 'User-Agent': 'akiya-portal/1.0 (+https://akiya-rho.vercel.app)' },
  });
  if (!res.ok) throw new Error(`list fetch HTTP ${res.status}`);
  const html = await res.text();

  const rows = parseList(html);
  for (const r of rows) {
    // _addressJa already starts with 新潟県 — don't prepend it again.
    const g = await geocode(r._addressJa, '');
    if (g) {
      r.lat = g.lat;
      r.lng = g.lng;
    }
    delete r._addressJa;
  }
  return rows;
}
