import { supabase, isSupabaseConfigured } from './supabase.js';
import { LISTINGS as DEMO } from '../data/listings.js';

// Maps a Supabase row (snake_case) to the camelCase shape the UI expects,
// so components don't change when the data source flips.
function fromRow(r) {
  return {
    id: r.id,
    title: r.title,
    prefecture: r.prefecture,
    city: r.city,
    price: r.price,
    isFree: r.is_free,
    condition: r.condition,
    locality: r.locality,
    sizeM2: Number(r.size_m2),
    landM2: Number(r.land_m2),
    yearBuilt: r.year_built,
    bedrooms: r.bedrooms,
    lat: r.lat,
    lng: r.lng,
    image: r.image,
    description: r.description,
  };
}

// Great-circle distance in km (demo-mode fallback for radius search).
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
 * Listings within `km` of (lat,lng). Uses the PostGIS RPC
 * listings_within_km when Supabase is live; otherwise haversine-filters
 * the demo array. Rows without coordinates are excluded (by design).
 */
export async function getListingsNear(lat, lng, km) {
  if (!isSupabaseConfigured || !supabase) {
    const near = DEMO.filter(
      (l) =>
        l.lat != null &&
        l.lng != null &&
        haversineKm(lat, lng, l.lat, l.lng) <= km
    ).sort((a, b) => a.price - b.price);
    return { listings: near, source: 'demo' };
  }
  try {
    const { data, error } = await supabase.rpc('listings_within_km', {
      center_lat: lat,
      center_lng: lng,
      radius_km: km,
    });
    if (error) throw error;
    return { listings: (data || []).map(fromRow), source: 'supabase' };
  } catch (e) {
    console.warn('Supabase radius query failed, using demo data:', e.message);
    const near = DEMO.filter(
      (l) =>
        l.lat != null &&
        l.lng != null &&
        haversineKm(lat, lng, l.lat, l.lng) <= km
    ).sort((a, b) => a.price - b.price);
    return { listings: near, source: 'demo' };
  }
}

/**
 * Returns { listings, source } where source is 'supabase' | 'demo'.
 * Falls back to the bundled demo array if Supabase isn't configured,
 * errors, or returns nothing — the UI always has data to show.
 */
export async function getListings() {
  if (!isSupabaseConfigured || !supabase) {
    return { listings: DEMO, source: 'demo' };
  }
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('active', true)
      .order('price', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) {
      return { listings: DEMO, source: 'demo' };
    }
    return { listings: data.map(fromRow), source: 'supabase' };
  } catch (e) {
    console.warn('Supabase listings fetch failed, using demo data:', e.message);
    return { listings: DEMO, source: 'demo' };
  }
}
