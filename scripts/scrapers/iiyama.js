// Iiyama City (Nagano) akiya bank scraper.
// Source: https://furusato-iiyama.net/akiyabank/usedhouse/
//
// The index lists used-house posts (WordPress/Cocoon "entry card" anchors
// linking to /aNNN/ detail pages). Price/area/address live on the detail
// page in a label/value table. parseDetail() is pure (HTML string -> row)
// so it can be unit-tested without a browser; scrapeIiyama() drives
// Playwright over the live site and delegates parsing to it.

import { geocode } from '../lib/geocode.js';
import { getPopulation } from '../lib/population.js';

export const SOURCE = 'iiyama-city';
const BASE = 'https://furusato-iiyama.net';
const INDEX = `${BASE}/akiyabank/usedhouse/`;

// --- pure helpers (testable) -------------------------------------------

function stripToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// "400万円" -> 4000000 ; "1,600万円" -> 16000000 ; negotiable/blank -> 0
function parseYen(text) {
  if (!text) return 0;
  const man = text.match(/([\d,]+(?:\.\d+)?)\s*万円/);
  if (man) return Math.round(parseFloat(man[1].replace(/,/g, '')) * 10_000);
  const yen = text.match(/([\d,]+)\s*円/);
  if (yen) return parseInt(yen[1].replace(/,/g, ''), 10);
  return 0;
}

function parseArea(text) {
  if (!text) return null;
  const m = text.match(/([\d,]+(?:\.\d+)?)\s*(?:㎡|m²|平方メートル)/);
  return m ? parseFloat(m[1].replace(/,/g, '')) : null;
}

// 補修の要否 -> condition enum used by the schema/UI
function mapCondition(repair, usage) {
  const s = `${repair || ''} ${usage || ''}`;
  if (/解体|取壊|取り壊|更地/.test(s)) return 'tear-down';
  if (/不要|そのまま|良好/.test(s)) return 'move-in';
  return 'needs-work';
}

// "8SSDK" / "3K" / "1LDK" -> leading room count, else null
function parseBedrooms(layout) {
  const m = (layout || '').match(/^\s*(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function field(text, label) {
  // label cell directly precedes its value in the de-tagged stream
  const re = new RegExp(
    label + '\\s*([^ ].*?)(?=\\s*(?:登録No\\.|分類|所在地|価格|間取り|' +
      '土地面積|建物面積|利用状況|補修の要否|電気|ガス|風呂|水道|構造|$))'
  );
  const m = text.match(re);
  return m ? m[1].trim() : null;
}

/**
 * Pure parser: detail-page HTML + its URL -> normalized listing row,
 * or null if it doesn't look like a sellable house listing.
 */
export function parseDetail(html, url) {
  const text = stripToText(html);

  const regNo = field(text, '登録No\\.') || field(text, '登録番号');
  if (!regNo) return null;

  const category = field(text, '分類') || '';
  if (!/売買|中古住宅/.test(category)) return null; // skip rentals/land

  const price = parseYen(field(text, '価格'));
  const layout = field(text, '間取り');
  const repair = field(text, '補修の要否');
  const usage = field(text, '利用状況');
  const addressJa = field(text, '所在地') || '';

  // og:image is the property's eye-catch photo (falls back to none).
  const ogImg = html.match(
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
  );

  return {
    source: SOURCE,
    source_id: regNo,
    id: `${SOURCE}:${regNo}`,
    title: `Iiyama akiya ${regNo}${layout ? ` — ${layout}` : ''}`,
    prefecture: 'Nagano',
    city: 'Iiyama',
    price,
    is_free: price === 0,
    condition: mapCondition(repair, usage),
    locality: 'rural', // Iiyama is rural snow country
    size_m2: parseArea(field(text, '建物面積')),
    land_m2: parseArea(field(text, '土地面積')),
    year_built: null, // not published on these pages
    bedrooms: parseBedrooms(layout),
    lat: null, // filled by geocoding in scrapeIiyama()
    lng: null,
    population: null, // filled in scrapeIiyama()
    image: ogImg ? ogImg[1] : null,
    description:
      `${addressJa} — ${layout || ''}. ` +
      `利用状況: ${usage || 'n/a'}. 補修: ${repair || 'n/a'}. ` +
      `Source: ${url}`,
    source_url: url,
    _addressJa: addressJa, // consumed by geocoding, stripped before upsert
  };
}

// --- live scrape (Playwright) ------------------------------------------

export async function scrapeIiyama(browser) {
  const page = await browser.newPage();
  await page.goto(INDEX, { waitUntil: 'domcontentloaded', timeout: 45_000 });

  // Detail posts are /aNNN/ (optionally /aNNN-2/). Collect unique links.
  const links = await page.$$eval('a', (as) =>
    as
      .map((a) => a.href)
      .filter((h) => /\/a\d+(?:-\d+)?\/?$/.test(h))
  );
  const unique = [...new Set(links)];

  const rows = [];
  for (const url of unique) {
    try {
      const d = await browser.newPage();
      await d.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      const html = await d.content();
      await d.close();
      const row = parseDetail(html, url);
      if (row) rows.push(row);
    } catch (e) {
      console.warn(`[${SOURCE}] skip ${url}: ${e.message}`);
    }
  }
  await page.close();

  // Geocode sequentially (Nominatim 1 req/sec; cached across runs).
  for (const r of rows) {
    const g = await geocode(r._addressJa, '長野県');
    if (g) {
      r.lat = g.lat;
      r.lng = g.lng;
    }
    delete r._addressJa;
  }
  // Single municipality — one population lookup for all rows.
  const iiyamaPop = await getPopulation('長野県飯山市');
  for (const r of rows) r.population = iiyamaPop;
  return rows;
}
