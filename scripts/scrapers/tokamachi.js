// Tokamachi City (Niigata) akiya bank scraper.  *** WIP — NOT REGISTERED ***
//
// Status: NOT wired into scripts/scrape.js. The akiya-athome.jp platform
// renders the photo/blurb cards and the price/area RESULTS TABLE as
// separate DOM regions; the current per-link window conflates them, so
// every row gets the first card's price/layout (verified bug). Do not
// register until parseList() joins table rows to cards by id (the table
// `<tr>`s carry the real price/間取り/面積 keyed by the same detail id).
//
// Source: akiya-athome.jp platform (used by many municipalities — once
// fixed this is a reusable template for other *-athome.jp banks).

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

/**
 * Pure parser: full list-page HTML -> array of normalized rows.
 */
export function parseList(html) {
  const linkRe =
    /href="(\/bukken\/detail\/buy\/[^"]*?-(\d+))"/g;
  const seen = new Set();
  const rows = [];
  let m;

  while ((m = linkRe.exec(html))) {
    const id = m[2];
    if (seen.has(id)) continue;
    seen.add(id);

    // Card window: from this link back to the prior card start, forward
    // to the next link — generous enough to include price/layout text.
    const at = m.index;
    const start = html.lastIndexOf('property-list-one', at);
    const next = html.indexOf('/bukken/detail/buy/', at + m[1].length);
    const win = html.slice(start >= 0 ? start : at, next > 0 ? next + 200 : at + 2500);
    const text = detag(win);

    const price = parseYen(text);
    const layout = (text.match(/\b(\d+[SLDK]{1,4})\b/) || [])[1] || null;
    const addr =
      (text.match(/(新潟県十日町市[^\sＪJ（(]+)/) || [])[1] ||
      (text.match(/十日町市[^\sＪJ（(]+/) || [])[0] ||
      '十日町市';
    const imgRel =
      (win.match(/\/\/img\.akiya-athome\.jp\/\?v=[^"'\s]+/) || [])[0] || null;

    if (price <= 0 && !layout) continue; // not a real sale card

    rows.push({
      source: SOURCE,
      source_id: id,
      id: `${SOURCE}:${id}`,
      title: `Tokamachi akiya ${id}${layout ? ` — ${layout}` : ''}`,
      prefecture: 'Niigata',
      city: 'Tokamachi',
      price,
      is_free: price <= 0,
      condition: mapCondition(text),
      locality: 'rural',
      size_m2: null, // only in JS-rendered table
      land_m2: null,
      year_built: yearFromAge(text),
      bedrooms: parseBedrooms(layout),
      lat: null,
      lng: null,
      image: imgRel ? `https:${imgRel}` : null,
      description:
        `${addr}. ${layout || ''}. ` +
        `${(text.match(/([^。]{8,140}物件です。)/) || [, ''])[1] || ''} ` +
        `Source: ${BASE}${m[1]}`,
      source_url: `${BASE}${m[1]}`,
      _addressJa: addr,
    });
  }
  return rows;
}

export async function scrapeTokamachi(browser) {
  const page = await browser.newPage();
  await page.goto(LIST, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  const html = await page.content();
  await page.close();

  const rows = parseList(html);
  for (const r of rows) {
    const g = await geocode(r._addressJa, '新潟県');
    if (g) {
      r.lat = g.lat;
      r.lng = g.lng;
    }
    delete r._addressJa;
  }
  return rows;
}
