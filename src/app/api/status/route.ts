import { NextResponse } from 'next/server';
import { isSupabaseConfigured, isSupabaseAnonConfigured } from '@/lib/supabase';
import { getAIProviderName } from '@/lib/ai';
import { isDemoMode } from '@/lib/demo-store';

// GET /api/status — System configuration status (public, no auth required)
export async function GET() {
  const supabaseConfigured = isSupabaseConfigured();
  const supabaseAnonAvailable = isSupabaseAnonConfigured();
  const demoMode = isDemoMode();
  const aiProvider = getAIProviderName();
  const jwtSecretSet = !!process.env.JWT_SECRET;

  const warnings: string[] = [];
  if (!jwtSecretSet) {
    warnings.push('JWT_SECRET not set — sessions may not persist across server restarts. Set JWT_SECRET in Vercel environment variables.');
  }
  if (!supabaseConfigured) {
    warnings.push('Supabase not configured — using demo mode (in-memory, data will not persist). Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in Vercel environment variables.');
  }
  if (!process.env.GEMINI_API_KEY) {
    warnings.push('GEMINI_API_KEY not set — using fallback AI provider. Set GEMINI_API_KEY in Vercel environment variables for best results.');
  }

  return NextResponse.json({
    status: {
      database: supabaseConfigured ? 'Supabase (connected)' : demoMode ? 'Demo (in-memory)' : 'Not configured',
      databaseType: supabaseConfigured ? 'supabase' : 'demo',
      supabaseAnonAvailable,
      aiProvider,
      aiProviderType: aiProvider.includes('Gemini') ? 'gemini' : 'z-ai-sdk',
      demoMode,
      jwtSecretSet,
      warnings: warnings.length > 0 ? warnings : undefined,
    },
  });
}
