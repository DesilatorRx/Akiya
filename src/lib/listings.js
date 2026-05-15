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
