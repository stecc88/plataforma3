import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { generateClassPreparation } from '@/lib/ai';

// POST /api/preparations/generate - Generate class preparation content with AI
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, 'TEACHER');
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { topic, title, level } = body;

    if (!topic) {
      return NextResponse.json(
        { error: 'L\'argomento è obbligatorio' },
        { status: 400 }
      );
    }

    const content = await generateClassPreparation(topic || title, level);

    return NextResponse.json({ content });
  } catch (error) {
    console.error('Generate preparation error:', error);
    return NextResponse.json(
      { error: 'Errore nella generazione della preparazione' },
      { status: 500 }
    );
  }
}
