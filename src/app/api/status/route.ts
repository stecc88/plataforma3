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

  return NextResponse.json({
    status: {
      database: supabaseConfigured ? 'Supabase (connected)' : demoMode ? 'Demo (in-memory)' : 'Not configured',
      databaseType: supabaseConfigured ? 'supabase' : 'demo',
      supabaseAnonAvailable,
      aiProvider,
      aiProviderType: aiProvider.includes('Gemini') ? 'gemini' : 'z-ai-sdk',
      demoMode,
    },
  });
}
