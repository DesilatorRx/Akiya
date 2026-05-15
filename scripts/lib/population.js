// Municipality population via Wikidata (no API key). Given a Japanese
// city key like "新潟県十日町市", searches the city name, picks the
// municipality entity, and returns its most recent P1082 (population).
// Disk-cached so nightly CI looks up only municipalities it hasn't seen.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const CACHE_FILE = fileURLToPath(new URL('../.popcache.json', import.meta.url));
const UA = 'akiya-portal/1.0 (+https://akiya-rho.vercel.app)';
const PREF =
  /^(北海道|青森県|岩手県|宮城県|秋田県|山形県|福島県|茨城県|栃木県|群馬県|埼玉県|千葉県|東京都|神奈川県|新潟県|富山県|石川県|福井県|山梨県|長野県|岐阜県|静岡県|愛知県|三重県|滋賀県|京都府|大阪府|兵庫県|奈良県|和歌山県|鳥取県|島根県|岡山県|広島県|山口県|徳島県|香川県|愛媛県|高知県|福岡県|佐賀県|長崎県|熊本県|大分県|宮崎県|鹿児島県|沖縄県)/;

let cache = {};
try {
  if (existsSync(CACHE_FILE)) cache = JSON.parse(readFileSync(CACHE_FILE, 'utf8'));
} catch {
  cache = {};
}

let last = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function persist() {
  try {
    mkdirSync(dirname(CACHE_FILE), { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify(cache));
  } catch {
    /* best-effort */
  }
}

/**
 * @param {string} cityKey e.g. "新潟県十日町市"
 * @returns {Promise<number|null>}
 */
export async function getPopulation(cityKey) {
  if (!cityKey) return null;
  if (cityKey in cache) return cache[cityKey];

  const city = cityKey.replace(PREF, '').trim() || cityKey;

  const wait = 350 - (Date.now() - last);
  if (wait > 0) await sleep(wait);
  last = Date.now();

  try {
    const s = await (
      await fetch(
        'https://www.wikidata.org/w/api.php?action=wbsearchentities&search=' +
          encodeURIComponent(city) +
          '&language=ja&format=json&type=item&limit=5&origin=*',
        { headers: { 'User-Agent': UA } }
      )
    ).json();
    const cand =
      (s.search || []).find(
        (x) =>
          /市|町|村/.test(x.label || '') &&
          /市|町|村|municipality|city|town|village/i.test(x.description || '')
      ) || (s.search || [])[0];
    if (!cand) {
      cache[cityKey] = null;
      persist();
      return null;
    }
    const d = await (
      await fetch(
        `https://www.wikidata.org/wiki/Special:EntityData/${cand.id}.json`,
        { headers: { 'User-Agent': UA } }
      )
    ).json();
    const claims = d.entities?.[cand.id]?.claims?.P1082 || [];
    let best = null;
    let bestT = '';
    for (const c of claims) {
      const v = c.mainsnak?.datavalue?.value?.amount;
      if (!v) continue;
      const t = c.qualifiers?.P585?.[0]?.datavalue?.value?.time || '';
      if (best == null || t > bestT) {
        best = Math.round(Number(v));
        bestT = t;
      }
    }
    cache[cityKey] = best;
    persist();
    return best;
  } catch (e) {
    console.warn(`[population] "${cityKey}" failed: ${e.message}`);
    cache[cityKey] = null;
    persist();
    return null;
  }
}
