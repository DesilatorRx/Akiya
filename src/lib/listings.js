import { supabase, isSupabaseConfigured } from './supabase.js';

// All listing data is live from Supabase. There is no demo/fake fallback:
// if Supabase is unavailable the UI shows an honest "unavailable" state
// rather than fabricated listings.
//
// Return shape: { listings, source } where source is:
//   'supabase'    — query succeeded (listings may legitimately be empty)
//   'unavailable' — not configured or the query failed

// Maps a Supabase row (snake_case) to the camelCase shape the UI expects.
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
    sizeM2: r.size_m2 == null ? null : Number(r.size_m2),
    landM2: r.land_m2 == null ? null : Number(r.land_m2),
    yearBuilt: r.year_built,
    bedrooms: r.bedrooms,
    lat: r.lat,
    lng: r.lng,
    image: r.image,
    description: r.description,
    sourceUrl: r.source_url,
    population: r.population ?? null,
  };
}

/**
 * Single listing by source + source_id (its DB id is `${source}:${id}`).
 * @returns {{ listing, source }} listing is null if not found/unavailable.
 */
export async function getListingById(src, sourceId) {
  if (!isSupabaseConfigured || !supabase) {
    return { listing: null, source: 'unavailable' };
  }
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', `${src}:${sourceId}`)
      .eq('active', true)
      .maybeSingle();
    if (error) throw error;
    return {
      listing: data ? fromRow(data) : null,
      source: 'supabase',
    };
  } catch (e) {
    console.warn('Supabase single-listing fetch failed:', e.message);
    return { listing: null, source: 'unavailable' };
  }
}

// PostgREST caps each response (Supabase default 1000 rows). Page through
// with .range() so the client gets the full set (~1.5k listings).
export async function getListings() {
  if (!isSupabaseConfigured || !supabase) {
    return { listings: [], source: 'unavailable' };
  }
  try {
    const PAGE = 1000;
    let from = 0;
    const all = [];
    for (;;) {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('active', true)
        .order('price', { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) throw error;
      const batch = data || [];
      all.push(...batch);
      if (batch.length < PAGE) break;
      from += PAGE;
    }
    return { listings: all.map(fromRow), source: 'supabase' };
  } catch (e) {
    console.warn('Supabase listings fetch failed:', e.message);
    return { listings: [], source: 'unavailable' };
  }
}

/**
 * Listings within `km` of (lat,lng) via the PostGIS listings_within_km RPC.
 * Rows without coordinates are excluded server-side (by design).
 */
export async function getListingsNear(lat, lng, km) {
  if (!isSupabaseConfigured || !supabase) {
    return { listings: [], source: 'unavailable' };
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
    console.warn('Supabase radius query failed:', e.message);
    return { listings: [], source: 'unavailable' };
  }
}
