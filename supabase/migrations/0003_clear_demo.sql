-- Remove the seeded demo listings. Run in the Supabase SQL Editor once
-- real scraped data is flowing (it is: source='iiyama-city').
--
-- Safe & idempotent: only deletes rows tagged source='demo'. Scraped rows
-- (source='iiyama-city', future banks) are untouched. After this, the app
-- has NO fake data anywhere — an outage shows an honest "unavailable"
-- message instead of fabricated listings.

delete from public.listings where source = 'demo';

-- Sanity check: should list only real sources (e.g. iiyama-city) and counts.
select source, count(*) as listings
from public.listings
where active
group by source
order by source;
