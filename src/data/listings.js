// Shared listing enums. All listing *data* now comes live from Supabase
// (see src/lib/listings.js) — there is no demo/fallback data anywhere.
//
// condition values match the DB CHECK constraint on public.listings.

export const CONDITIONS = {
  'move-in': { label: 'Move-in ready', color: '#2e7d32' },
  'needs-work': { label: 'Needs work', color: '#bc7a2e' },
  'tear-down': { label: 'Tear-down / land value', color: '#bc2e2e' },
};
