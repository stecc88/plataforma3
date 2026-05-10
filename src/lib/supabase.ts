import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────
// Supabase clients for ScribIA
// ─────────────────────────────────────────────────────────────
//
// Two clients are provided:
//   1. `supabase`        — service_role key (backend only, bypasses RLS)
//   2. `supabaseAnon`    — anon key (safe for client-side, respects RLS)
//
// If Supabase is not configured, null clients are exported and the
// app falls back to demo-store mode automatically.
//
// Environment variables required:
//   NEXT_PUBLIC_SUPABASE_URL
//   NEXT_PUBLIC_SUPABASE_ANON_KEY   ← client-side, public
//   SUPABASE_SERVICE_ROLE_KEY       ← server-side only, NEVER expose
// ─────────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️ Supabase credentials not configured. Using demo mode.');
}

// ── Check if Supabase is properly configured ─────────────────
export const isSupabaseConfigured = (): boolean => {
  return !!(
    supabaseUrl &&
    supabaseServiceKey &&
    supabaseUrl !== 'https://placeholder.supabase.co' &&
    supabaseUrl !== 'https://your-project.supabase.co'
  );
};

// ── Check if client-side Supabase is available ───────────────
export const isSupabaseAnonConfigured = (): boolean => {
  return !!(
    supabaseUrl &&
    supabaseAnonKey &&
    supabaseUrl !== 'https://placeholder.supabase.co' &&
    supabaseUrl !== 'https://your-project.supabase.co'
  );
};

// ── Backend client (service_role, bypasses RLS) ──────────────
// Use ONLY in API routes (server-side)
// Lazy-initialised: only creates a real client when Supabase is configured
let _supabaseServer: SupabaseClient | null = null;

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    if (!isSupabaseConfigured()) {
      // Return a no-op proxy that won't crash but logs a warning
      console.warn('⚠️ Supabase not configured — operation will be handled by demo store');
      return () => ({ data: null, error: { message: 'Supabase not configured' } });
    }
    if (!_supabaseServer) {
      _supabaseServer = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
    }
    const value = (_supabaseServer as any)[prop];
    return typeof value === 'function' ? value.bind(_supabaseServer) : value;
  },
});

// ── Client-side client (anon key, respects RLS) ──────────────
// Safe to use in browser components
let _supabaseAnon: SupabaseClient | null = null;

export const supabaseAnon: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    if (!isSupabaseAnonConfigured()) {
      console.warn('⚠️ Supabase anon not configured');
      return () => ({ data: null, error: { message: 'Supabase anon not configured' } });
    }
    if (!_supabaseAnon) {
      _supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { autoRefreshToken: true, persistSession: true },
      });
    }
    const value = (_supabaseAnon as any)[prop];
    return typeof value === 'function' ? value.bind(_supabaseAnon) : value;
  },
});
