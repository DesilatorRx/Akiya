-- Akiya portal — Phase 2 schema.
-- Run in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY guards.

-- PostGIS for radius search (Supabase ships it; just enable).
create extension if not exists postgis;

create table if not exists public.listings (
  id          text primary key,                 -- e.g. 'aky-001' or '<source>:<source_id>'
  source      text not null default 'demo',      -- 'demo' | municipal bank slug
  source_id   text,                              -- id within the source site
  title       text not null,
  prefecture  text not null,
  city        text not null,
  price       bigint not null default 0,         -- JPY; 0 = free
  is_free     boolean not null default false,
  condition   text not null
              check (condition in ('move-in','needs-work','tear-down')),
  locality    text not null default 'typical'
              check (locality in ('rural','typical','urban')),
  size_m2     numeric,
  land_m2     numeric,
  year_built  integer,
  bedrooms    integer,
  lat         double precision,
  lng         double precision,
  geo         geography(Point, 4326),            -- derived from lat/lng by trigger
  image       text,
  description text,
  active      boolean not null default true,     -- scraper flags stale rows false
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (source, source_id)
);

-- Keep geo + updated_at in sync with lat/lng on every write.
create or replace function public.set_listing_geo()
returns trigger
language plpgsql
as $$
begin
  if new.lat is not null and new.lng is not null then
    new.geo := st_setsrid(st_makepoint(new.lng, new.lat), 4326)::geography;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_listings_geo on public.listings;
create trigger trg_listings_geo
before insert or update on public.listings
for each row execute function public.set_listing_geo();

create index if not exists listings_geo_idx   on public.listings using gist (geo);
create index if not exists listings_price_idx on public.listings (price);
create index if not exists listings_pref_idx  on public.listings (prefecture);

-- Row-Level Security: the publishable/anon key may ONLY read active rows.
-- Writes happen via the scraper using the service_role key, which bypasses RLS.
alter table public.listings enable row level security;

drop policy if exists "public read active listings" on public.listings;
create policy "public read active listings"
on public.listings
for select
to anon, authenticated
using (active = true);

-- Optional helper for Phase 2 "within X km" search.
create or replace function public.listings_within_km(
  center_lat double precision,
  center_lng double precision,
  radius_km  double precision
)
returns setof public.listings
language sql
stable
as $$
  select *
  from public.listings
  where active
    and geo is not null
    and st_dwithin(
          geo,
          st_setsrid(st_makepoint(center_lng, center_lat), 4326)::geography,
          radius_km * 1000
        )
  order by price asc;
$$;
