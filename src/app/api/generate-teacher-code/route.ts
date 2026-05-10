import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { generateTeacherCode } from '@/lib/db';

// POST /api/generate-teacher-code - Generate teacher code (ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, 'ADMIN');
    if (user instanceof NextResponse) return user;

    const code = generateTeacherCode();

    return NextResponse.json({
      code,
      message: 'Codice docente generato con successo',
    });
  } catch (error) {
    console.error('Generate teacher code error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
