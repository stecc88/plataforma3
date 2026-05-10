import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { essayOps, userOps } from '@/lib/db';
import { correctEssay } from '@/lib/ai';

// POST /api/essays/[id]/correct - AI correct essay with optional CILS level assessment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (user instanceof NextResponse) return user;

    const { id } = await params;

    const essay = await essayOps.findUnique({ where: { id } });

    if (!essay) {
      return NextResponse.json(
        { error: 'Tema non trovato' },
        { status: 404 }
      );
    }

    // Check access
    if (user.role === 'STUDENT' && essay.studentId !== user.userId) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 403 }
      );
    }

    // Parse optional targetLevel from request body
    let targetLevel: string | undefined;
    try {
      const body = await request.json();
      if (body?.targetLevel && typeof body.targetLevel === 'string') {
        const validLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
        if (validLevels.includes(body.targetLevel.toUpperCase())) {
          targetLevel = body.targetLevel.toUpperCase();
        }
      }
    } catch {
      // No body or invalid JSON — proceed without targetLevel
    }

    // Call AI correction with optional targetLevel
    const correction = await correctEssay(
      essay.title as string,
      essay.content as string,
      (essay.topic as string) || undefined,
      targetLevel
    );

    const now = new Date().toISOString();

    // Serialize CILS assessment and errors for storage
    const cilsLevelAssessment = correction.cilsLevelAssessment
      ? JSON.stringify(correction.cilsLevelAssessment)
      : null;
    const errors = correction.errors.length > 0
      ? JSON.stringify(correction.errors)
      : null;

    // Update essay
    const updated = await essayOps.update({
      where: { id },
      data: {
        correctedContent: correction.correctedContent,
        score: correction.score,
        grammarScore: correction.grammarScore,
        coherenceScore: correction.coherenceScore,
        vocabularyScore: correction.vocabularyScore,
        clarityScore: correction.clarityScore,
        aiFeedback: correction.aiFeedback,
        errorAnnotations: correction.errorAnnotations,
        cilsLevelAssessment,
        errors,
        status: 'CORRECTED',
        updatedAt: now,
      },
    });

    // Get student name
    const student = await userOps.findUnique({
      where: { id: updated.studentId as string },
    });

    // Parse stored JSON fields back for the response
    let parsedCilsAssessment = null;
    try {
      if (updated.cilsLevelAssessment) {
        parsedCilsAssessment = typeof updated.cilsLevelAssessment === 'string'
          ? JSON.parse(updated.cilsLevelAssessment)
          : updated.cilsLevelAssessment;
      }
    } catch {
      parsedCilsAssessment = null;
    }

    let parsedErrors: unknown[] = [];
    try {
      if (updated.errors) {
        parsedErrors = typeof updated.errors === 'string'
          ? JSON.parse(updated.errors)
          : updated.errors;
      }
    } catch {
      parsedErrors = [];
    }

    return NextResponse.json({
      essay: {
        id: updated.id as string,
        studentId: updated.studentId as string,
        title: updated.title as string,
        content: updated.content as string,
        topic: (updated.topic as string) || null,
        correctedContent: updated.correctedContent as string,
        score: updated.score as number,
        grammarScore: updated.grammarScore as number,
        coherenceScore: updated.coherenceScore as number,
        vocabularyScore: updated.vocabularyScore as number,
        clarityScore: updated.clarityScore as number,
        aiFeedback: updated.aiFeedback as string,
        errorAnnotations: updated.errorAnnotations as string,
        errors: parsedErrors,
        cilsLevelAssessment: parsedCilsAssessment,
        status: updated.status as string,
        createdAt: updated.createdAt as string,
        updatedAt: updated.updatedAt as string,
        studentName: (student?.name as string) || 'Sconosciuto',
      },
    });
  } catch (error) {
    console.error('Correct essay error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
