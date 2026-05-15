-- Email capture for new-listing alerts. Run in the Supabase SQL Editor.
-- RLS: the public (anon/publishable key) may INSERT a signup but may NOT
-- read, update or delete — so the email list can't be scraped back out.

create table if not exists public.subscribers (
  id          uuid primary key default gen_random_uuid(),
  email       text not null unique,
  prefecture  text,                 -- optional interest filter
  max_price   bigint,               -- optional, JPY
  created_at  timestamptz not null default now()
);

alter table public.subscribers enable row level security;

drop policy if exists "anon can subscribe" on public.subscribers;
create policy "anon can subscribe"
on public.subscribers
for insert
to anon, authenticated
with check (
  email is not null
  and char_length(email) between 5 and 254
  and email like '%_@_%.__%'
);
-- (no select/update/delete policy = nobody can read the list via the
--  publishable key; only the service_role / SQL editor can.)
