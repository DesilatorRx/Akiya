import { supabase, isSupabaseConfigured } from './supabase.js';

// Submit a "help me buy this property" lead. RLS allows anon INSERT only.
// Returns { ok, error }.
export async function submitLead({ email, message, listing }) {
  const clean = (email || '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/.test(clean)) {
    return { ok: false, error: 'Please enter a valid email address.' };
  }
  if ((message || '').length > 2000) {
    return { ok: false, error: 'Message is too long.' };
  }
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: 'Unavailable right now — please try again.' };
  }
  const { error } = await supabase.from('leads').insert({
    email: clean,
    message: (message || '').trim() || null,
    listing_id: listing?.id || null,
    listing_source: listing?.id ? listing.id.split(':')[0] : null,
    listing_url: listing?.sourceUrl || null,
  });
  if (error) {
    return { ok: false, error: 'Could not send — please try again.' };
  }
  return { ok: true };
}
