// Human-readable English listing title derived from structured fields —
// no AI, deterministic, works for every scraped row instantly.
//
// Scraped titles look like "Tokamachi akiya 25260 — 9DK" (internal id +
// Japanese layout code). We keep the layout (DK/LDK is standard JP
// real-estate notation akiya buyers learn) but drop the id and lead with
// something a buyer scans: size, condition, place.

const COND_WORD = {
  'move-in': 'move-in-ready',
  'needs-work': 'project',
  'tear-down': 'land / tear-down',
};

// Pull the layout token (e.g. "9DK", "1LDK") off the scraped title.
function layoutOf(listing) {
  const m = /—\s*([0-9]+[SLDKR]{1,4})\s*$/.exec(listing.title || '');
  return m ? m[1] : null;
}

export function displayTitle(listing) {
  const layout = layoutOf(listing);
  const size = layout
    ? `${layout} home`
    : listing.bedrooms
    ? `${listing.bedrooms}-bed home`
    : 'Akiya home';
  const cond = listing.isFree
    ? 'free'
    : COND_WORD[listing.condition] || '';
  const where = `${listing.city}, ${listing.prefecture}`;
  return `${cond ? cond[0].toUpperCase() + cond.slice(1) + ' ' : ''}${size} — ${where}`;
}
