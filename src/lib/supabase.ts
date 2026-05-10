import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────
// Supabase clients for ScribIA
// ─────────────────────────────────────────────────────────────
//
// Two clients are provided:
//   1. `supabase`        — service_role key (backend only, bypasses RLS)
//   2. `supabaseAnon`    — anon key (safe for client-side, respects RLS)
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

// ── Backend client (service_role, bypasses RLS) ──────────────
// Use ONLY in API routes (server-side)
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseServiceKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// ── Client-side client (anon key, respects RLS) ──────────────
// Safe to use in browser components
export const supabaseAnon: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
    },
  }
);

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
