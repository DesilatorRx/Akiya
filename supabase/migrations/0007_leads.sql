-- Buyer leads: "get help with this property" submissions. These are the
-- monetizable, actionable contacts (distinct from newsletter signups in
-- public.subscribers). Run in the Supabase SQL Editor. Idempotent.
--
-- RLS: anon/publishable key may INSERT only — it cannot read the lead
-- list back out. You read leads via the SQL editor / service_role.

create table if not exists public.leads (
  id              uuid primary key default gen_random_uuid(),
  email           text not null,
  listing_id      text,                -- "<source>:<source_id>" if from a listing
  listing_source  text,
  listing_url     text,
  message         text,
  created_at      timestamptz not null default now()
);

alter table public.leads enable row level security;

drop policy if exists "anon can submit lead" on public.leads;
create policy "anon can submit lead"
on public.leads
for insert
to anon, authenticated
with check (
  email is not null
  and char_length(email) between 5 and 254
  and email like '%_@_%.__%'
  and (message is null or char_length(message) <= 2000)
);
