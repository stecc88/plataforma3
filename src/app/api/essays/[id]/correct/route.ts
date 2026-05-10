import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, requireRole } from '@/lib/auth';
import { essayOps, userOps, enrollmentOps } from '@/lib/db';
import { correctEssay } from '@/lib/ai';

// ─── Simple in-memory rate limiter ────────────────────────────
const correctionTimestamps = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 5; // max 5 corrections per minute per user

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = correctionTimestamps.get(userId) || [];
  // Remove timestamps outside the window
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW);
  if (recent.length >= RATE_LIMIT_MAX) {
    return false; // Rate limited
  }
  recent.push(now);
  correctionTimestamps.set(userId, recent);
  return true;
}

// POST /api/essays/[id]/correct - AI correct essay with optional CILS level assessment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (user instanceof NextResponse) return user;

    // Rate limit check
    if (!checkRateLimit(user.userId)) {
      return NextResponse.json(
        { error: 'Troppe richieste. Riprova tra un minuto.' },
        { status: 429 }
      );
    }

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

    // Teacher must be enrolled with the student
    if (user.role === 'TEACHER') {
      const enrollment = await enrollmentOps.findUnique({
        where: { teacherId: user.userId, studentId: essay.studentId as string },
      });
      if (!enrollment) {
        return NextResponse.json(
          { error: 'Non autorizzato — lo studente non è iscritto alla tua classe' },
          { status: 403 }
        );
      }
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
    const studyTopics = correction.studyTopics.length > 0
      ? JSON.stringify(correction.studyTopics)
      : null;

    // Update essay — try full update first, then fall back to minimal update
    // if Supabase columns (study_topics, errors, cils_level_assessment) don't exist yet
    let updated: Record<string, unknown>;
    try {
      updated = await essayOps.update({
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
          studyTopics,
          status: 'CORRECTED',
          updatedAt: now,
        },
      });
    } catch (dbError) {
      console.warn('[ScribIA] Full update failed, trying minimal update:', dbError);
      // Fallback: update without the new columns that might not exist yet
      updated = await essayOps.update({
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
          status: 'CORRECTED',
          updatedAt: now,
        },
      });
      // Try to add the new columns separately
      try {
        updated = await essayOps.update({
          where: { id },
          data: { cilsLevelAssessment, errors, studyTopics },
        });
      } catch {
        console.warn('[ScribIA] Could not save cilsLevelAssessment/errors/studyTopics — columns may not exist in DB yet');
      }
    }

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

    let parsedStudyTopics: unknown[] = [];
    try {
      if ((updated as Record<string, unknown>).studyTopics) {
        parsedStudyTopics = typeof (updated as Record<string, unknown>).studyTopics === 'string'
          ? JSON.parse((updated as Record<string, unknown>).studyTopics as string)
          : (updated as Record<string, unknown>).studyTopics;
      }
    } catch {
      parsedStudyTopics = [];
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
        studyTopics: parsedStudyTopics,
        status: updated.status as string,
        createdAt: updated.createdAt as string,
        updatedAt: updated.updatedAt as string,
        studentName: (student?.name as string) || 'Sconosciuto',
      },
    });
  } catch (error) {
    console.error('Correct essay error:', error);
    const message = error instanceof Error ? error.message : 'Errore interno del server';
    return NextResponse.json(
      { error: 'Errore interno del server', detail: message },
      { status: 500 }
    );
  }
}
