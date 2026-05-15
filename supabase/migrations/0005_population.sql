-- Add municipality population (auto-sourced from Wikidata at scrape time)
-- so the UI can offer a town-size filter. Run in the Supabase SQL Editor
-- BEFORE the next scrape (rows will include this column). Idempotent.

alter table public.listings
  add column if not exists population integer;

-- listings_within_km returns "setof public.listings" — picks it up
-- automatically, no function change needed.
