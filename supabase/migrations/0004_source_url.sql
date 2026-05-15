-- Add a dedicated source_url column so the UI can render a clickable link
-- to the original akiya-bank listing (previously only embedded in the
-- description text). Run in the Supabase SQL Editor. Idempotent.

alter table public.listings
  add column if not exists source_url text;

-- listings_within_km returns "setof public.listings", so the new column
-- is picked up automatically — no function change needed.
