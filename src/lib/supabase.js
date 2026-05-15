import { createClient } from '@supabase/supabase-js';

// Singleton Supabase client. All listing data is served live from here
// (Postgres + PostGIS); there is no static/demo fallback.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

// Don't throw at import time — the app runs fully on demo data without
// Supabase configured. Components should guard with isSupabaseConfigured.
export const supabase = isSupabaseConfigured ? createClient(url, anonKey) : null;
