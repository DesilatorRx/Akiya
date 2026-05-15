import { createClient } from '@supabase/supabase-js';

// Singleton Supabase client. Phase 1 still uses the static LISTINGS array
// (see src/data/listings.js); this is wired up for the Phase 2 switch to
// live Postgres + PostGIS queries.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

// Don't throw at import time — the app runs fully on demo data without
// Supabase configured. Components should guard with isSupabaseConfigured.
export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null;
