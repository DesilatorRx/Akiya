import { supabase, isSupabaseConfigured } from './supabase.js';

// Insert a new-listing-alert signup. RLS lets anon INSERT only.
// Returns { ok, already, error }.
export async function subscribeEmail({ email, prefecture, maxPrice }) {
  const clean = (email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(clean)) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: 'Signups are temporarily unavailable.' };
  }
  const { error } = await supabase.from('subscribers').insert({
    email: clean,
    prefecture: prefecture && prefecture !== 'any' ? prefecture : null,
    max_price: maxPrice || null,
  });
  if (error) {
    // 23505 = unique violation -> already subscribed (treat as success).
    if (error.code === '23505') return { ok: true, already: true };
    return { ok: false, error: 'Could not subscribe — please try again.' };
  }
  return { ok: true };
}
