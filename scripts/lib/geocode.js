// Address -> { lat, lng } via OpenStreetMap Nominatim (no API key).
//
// Nominatim usage policy: max 1 req/sec, identifying User-Agent, cache
// results. We persist a disk cache so nightly CI re-geocodes only NEW
// addresses. Japanese street-level rarely resolves; city/district level
// does, which is accurate enough for "within X km" search.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const CACHE_FILE = new URL('../.geocache.json', import.meta.url).pathname;
const ENDPOINT = 'https://nominatim.openstreetmap.org/search';
const UA = 'akiya-portal/1.0 (+https://akiya-rho.vercel.app)';

let cache = {};
try {
  if (existsSync(CACHE_FILE)) cache = JSON.parse(readFileSync(CACHE_FILE, 'utf8'));
} catch {
  cache = {};
}

let lastCall = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function persist() {
  try {
    mkdirSync(dirname(CACHE_FILE), { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 0));
  } catch {
    /* cache is best-effort */
  }
}

// Drop parenthetical district notes the geocoder chokes on:
// "飯山市大字常盤（常盤地区 戸隠区）" -> "飯山市大字常盤"
function clean(addr) {
  return addr
    .replace(/[（(][^（）()]*[）)]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * @param {string} address  Japanese address fragment
 * @param {string} prefJa   prefecture in Japanese, e.g. '長野県' (improves hit rate)
 * @returns {Promise<{lat:number,lng:number}|null>}
 */
export async function geocode(address, prefJa = '') {
  if (!address) return null;
  const q = `${prefJa}${clean(address)}`.trim();
  if (q in cache) return cache[q];

  // Respect 1 req/sec.
  const wait = 1100 - (Date.now() - lastCall);
  if (wait > 0) await sleep(wait);
  lastCall = Date.now();

  try {
    const url =
      `${ENDPOINT}?format=json&limit=1&accept-language=ja&q=` +
      encodeURIComponent(q);
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arr = await res.json();
    const hit =
      arr && arr[0]
        ? { lat: parseFloat(arr[0].lat), lng: parseFloat(arr[0].lon) }
        : null;
    cache[q] = hit;
    persist();
    return hit;
  } catch (e) {
    console.warn(`[geocode] "${q}" failed: ${e.message}`);
    cache[q] = null;
    persist();
    return null;
  }
}
