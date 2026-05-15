import { SHINKANSEN } from '../data/shinkansen.js';
import { CITY_POPULATION } from '../data/population.js';

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
