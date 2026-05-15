// Reusable scraper for any municipal bank on the akiya-athome.jp platform.
//
// Every *-cNNNNN.akiya-athome.jp site shares one structure:
//   - /buy/house/list serves all sale houses in the initial HTML (the SPA
//     then mutates the DOM, so plain fetch() — not Playwright — is right)
//   - photo/blurb CARDS (one container, cards delimited by title anchors)
//   - a results TABLE whose <tr> carry price / 間取り / 面積 ("建物 / 土地")
// Both regions key off the same /bukken/detail/buy/...-<id>.
//
// makeAkiyaAthome(cfg) returns { SOURCE, scrape } for one municipality.
// cfg: { source, base, cityJa, prefJa, prefEn, cityEn, locality }

import { geocode } from '../lib/geocode.js';

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
 * Pure parser. cfg supplies the municipality so address extraction and
 * labels are not hardcoded to one city.
 */
export function parseAkiyaAthome(html, cfg) {
  const { source, base, cityJa, prefJa, prefEn, cityEn, locality } = cfg;

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
  const localityRe = new RegExp(
    cityJa + '\\s*([0-9０-９一-龯ぁ-んァ-ヶ丁目番地]+)'
  );
  let a;
  while ((a = aRe.exec(html))) {
    const id = a[1];
    if (cards.has(id)) continue;
    const win = html.slice(a.index, a.index + 1800);
    const text = detag(win);
    const after = text.replace(/【[^】]*】/g, ' '); // drop title bracket
    const loc = (after.match(localityRe) || [])[1] || '';
    const img = (win.match(/\/\/img\.akiya-athome\.jp\/\?v=[^"'\s]+/) || [])[0];
    const blurb = (text.match(/([^。]{8,140}物件です。)/) || [, ''])[1] || '';
    cards.set(id, {
      image: img ? `https:${img}` : null,
      addr: `${prefJa}${cityJa}${loc}`,
      year: yearFromAge(text),
      blurb,
      cond: mapCondition(text),
    });
  }

  // 3. Join — only ids present in the table are real priced listings.
  const rows = [];
  for (const [id, d] of table) {
    const c = cards.get(id) || {};
    const url = `${base}/bukken/detail/buy/-${id}`;
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
      description: `${c.addr || `${prefJa}${cityJa}`}. ${
        d.layout || ''
      }. ${c.blurb || ''}`.trim(),
      source_url: url,
      _addressJa: c.addr || `${prefJa}${cityJa}`,
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
      for (const r of rows) {
        // _addressJa already starts with prefJa — no extra prefix.
        const g = await geocode(r._addressJa, '');
        if (g) {
          r.lat = g.lat;
          r.lng = g.lng;
        }
        delete r._addressJa;
      }
      return rows;
    },
  };
}
