import { SHINKANSEN } from '../data/shinkansen.js';
import { CITY_POPULATION } from '../data/population.js';
import { COASTLINE } from '../data/coastline.js';

function haversineKm(aLat, aLng, bLat, bLng) {
  const R = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) *
      Math.cos((bLat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/**
 * Nearest Shinkansen station to a listing's coordinates.
 * Distance is straight-line (great-circle) — true walking/driving is
 * longer; the UI labels it honestly.
 * @returns {{name,line,km,walkMin}|null}
 */
export function nearestShinkansen(lat, lng) {
  if (lat == null || lng == null) return null;
  let best = null;
  for (const [name, line, sLat, sLng] of SHINKANSEN) {
    const km = haversineKm(lat, lng, sLat, sLng);
    if (!best || km < best.km) best = { name, line, km };
  }
  if (!best) return null;
  return {
    ...best,
    km: Math.round(best.km * 10) / 10,
    walkMin: Math.round((best.km / 5) * 60), // ~5 km/h
  };
}

export function cityPopulation(city) {
  return CITY_POPULATION[city] ?? null;
}

// Densify the hand-placed coastline: consecutive points are roughly in
// order along a shore, so for any pair closer than ~70 km (same coast,
// not a region jump) we linearly interpolate intermediate points every
// ~6 km. This cuts nearest-point error to a few km — enough to support
// tighter "walk to the sea" buckets — without hand-listing 100s of pts.
const DENSE_COAST = (() => {
  const out = [];
  const STEP_KM = 6;
  const MAX_GAP_KM = 70;
  for (let i = 0; i < COASTLINE.length; i++) {
    const [aLat, aLng] = COASTLINE[i];
    out.push([aLat, aLng]);
    const next = COASTLINE[i + 1];
    if (!next) continue;
    const [bLat, bLng] = next;
    const gap = haversineKm(aLat, aLng, bLat, bLng);
    if (gap > MAX_GAP_KM) continue; // region jump — don't bridge land
    const n = Math.floor(gap / STEP_KM);
    for (let k = 1; k < n; k++) {
      const f = k / n;
      out.push([aLat + (bLat - aLat) * f, aLng + (bLng - aLng) * f]);
    }
  }
  return out;
})();

/**
 * Straight-line km from (lat,lng) to the nearest coastline point
 * (densified). Approximate — it pairs with town-level coordinates, so it
 * reflects how coastal the *town* is, not the exact house. null if no
 * coordinates.
 */
export function nearestCoastKm(lat, lng) {
  if (lat == null || lng == null) return null;
  let best = Infinity;
  for (let i = 0; i < DENSE_COAST.length; i++) {
    const km = haversineKm(lat, lng, DENSE_COAST[i][0], DENSE_COAST[i][1]);
    if (km < best) best = km;
  }
  return best === Infinity ? null : Math.round(best);
}
