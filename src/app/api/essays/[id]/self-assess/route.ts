import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, requireRole } from '@/lib/auth';
import { essayOps, selfAssessmentOps } from '@/lib/db';
import crypto from 'crypto';

// GET /api/essays/[id]/self-assess — Get existing self-assessment for this essay
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (user instanceof NextResponse) return user;

    const { id } = await params;

    // Verify essay exists
    const essay = await essayOps.findUnique({ where: { id } });
    if (!essay) {
      return NextResponse.json({ error: 'Tema non trovato' }, { status: 404 });
    }

    // Find assessment for this student + essay
    const assessment = await selfAssessmentOps.findUnique({
      where: { essayId: id, studentId: user.userId },
    });

    if (!assessment) {
      return NextResponse.json({ assessment: null });
    }

    return NextResponse.json({
      assessment: {
        id: assessment.id as string,
        essayId: assessment.essayId as string,
        studentId: assessment.studentId as string,
        clarity: assessment.clarity as number,
        coherence: assessment.coherence as number,
        grammar: assessment.grammar as number,
        vocabulary: assessment.vocabulary as number,
        overallSelfScore: assessment.overallSelfScore as number,
        reflection: (assessment.reflection as string) || null,
        createdAt: assessment.createdAt as string,
      },
    });
  } catch (error) {
    console.error('Get self-assess error:', error);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

// POST /api/essays/[id]/self-assess — Create self-assessment
// - Only STUDENT can create
// - Only for their own essay
// - Supports both legacy slider format and new reflective format
// - New format: clarity/coherence/grammar/vocabulary are 0, reflection contains JSON
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(request, 'STUDENT');
    if (user instanceof NextResponse) return user;

    const { id } = await params;
    const body = await request.json();
    const { clarity, coherence, grammar, vocabulary, reflection } = body;

    // Support both old and new format
    // New format: clarity/coherence/grammar/vocabulary can be 0, reflection is JSON string
    // Old format: all scores required 1-10

    const isReflectiveFormat = clarity === 0 && coherence === 0 && grammar === 0 && vocabulary === 0;

    if (!isReflectiveFormat) {
      // Legacy format validation
      if (clarity == null || coherence == null || grammar == null || vocabulary == null) {
        return NextResponse.json(
          { error: 'Tutti i punteggi sono obbligatori (clarity, coherence, grammar, vocabulary)' },
          { status: 400 }
        );
      }
      for (const [key, val] of Object.entries({ clarity, coherence, grammar, vocabulary })) {
        if (typeof val !== 'number' || val < 1 || val > 10) {
          return NextResponse.json(
            { error: `${key} deve essere compreso tra 1 e 10` },
            { status: 400 }
          );
        }
      }
    }

    // For reflective format, validate that reflection contains valid JSON
    if (isReflectiveFormat && reflection) {
      try {
        const parsed = JSON.parse(reflection);
        if (!parsed.version || !parsed.errorResponses) {
          return NextResponse.json(
            { error: 'Formato autovalutazione non valido' },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: 'Formato riflessione non valido' },
          { status: 400 }
        );
      }
    }

    const overallSelfScore = isReflectiveFormat
      ? 0
      : Math.round(((clarity + coherence + grammar + vocabulary) / 4) * 10) / 10;

    // Verify essay exists and belongs to this student
    const essay = await essayOps.findUnique({ where: { id } });

    if (!essay) {
      return NextResponse.json(
        { error: 'Tema non trovato' },
        { status: 404 }
      );
    }

    if (essay.studentId !== user.userId) {
      return NextResponse.json(
        { error: 'Puoi autovalutare solo i tuoi temi' },
        { status: 403 }
      );
    }

    // Check if self-assessment already exists for this essay
    const existingAssessment = await selfAssessmentOps.findUnique({
      where: { essayId: id, studentId: user.userId },
    });
    if (existingAssessment) {
      return NextResponse.json(
        { error: 'Hai già effettuato un\'autovalutazione per questo tema' },
        { status: 409 }
      );
    }

    const assessmentId = crypto.randomUUID();
    const now = new Date().toISOString();

    const assessment = await selfAssessmentOps.create({
      data: {
        id: assessmentId,
        essayId: id,
        studentId: user.userId,
        clarity: isReflectiveFormat ? 0 : clarity,
        coherence: isReflectiveFormat ? 0 : coherence,
        grammar: isReflectiveFormat ? 0 : grammar,
        vocabulary: isReflectiveFormat ? 0 : vocabulary,
        overallSelfScore,
        reflection: reflection || null,
        createdAt: now,
      },
    });

    // Parse reflection for response
    let reflectiveData = null;
    if (isReflectiveFormat && assessment.reflection) {
      try {
        reflectiveData = JSON.parse(assessment.reflection as string);
      } catch {
        // ignore
      }
    }

    return NextResponse.json(
      {
        assessment: {
          id: assessment.id as string,
          essayId: assessment.essayId as string,
          studentId: assessment.studentId as string,
          clarity: assessment.clarity as number,
          coherence: assessment.coherence as number,
          grammar: assessment.grammar as number,
          vocabulary: assessment.vocabulary as number,
          overallSelfScore: assessment.overallSelfScore as number,
          reflection: (assessment.reflection as string) || null,
          reflectiveData,
          createdAt: assessment.createdAt as string,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Self-assess error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
