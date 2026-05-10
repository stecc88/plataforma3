import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { essayOps, userOps, selfAssessmentOps, enrollmentOps } from '@/lib/db';

/** Helper: safely parse JSON fields stored as strings in the DB */
function parseJsonField(value: unknown): unknown {
  if (!value) return null;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return null; }
  }
  return value;
}

// GET /api/essays/[id] - Get single essay with self_assessments
export async function GET(
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

    // Check access: student can only see own essays
    if (user.role === 'STUDENT' && essay.studentId !== user.userId) {
      return NextResponse.json(
        { error: 'Non autorizzato' },
        { status: 403 }
      );
    }

    // Teacher can only see essays from enrolled students
    if (user.role === 'TEACHER') {
      const enrollment = await enrollmentOps.findUnique({
        where: { teacherId: user.userId, studentId: essay.studentId as string },
      });
      if (!enrollment) {
        return NextResponse.json(
          { error: 'Non autorizzato' },
          { status: 403 }
        );
      }
    }

    // Get student name
    const student = await userOps.findUnique({
      where: { id: essay.studentId as string },
    });

    // Get self-assessments for this essay
    const assessments = await selfAssessmentOps.findMany({
      where: { essayId: id },
    });
    const selfAssessments = assessments.map((a) => ({
      id: a.id as string,
      essayId: a.essayId as string,
      studentId: a.studentId as string,
      clarity: a.clarity as number,
      coherence: a.coherence as number,
      grammar: a.grammar as number,
      vocabulary: a.vocabulary as number,
      overallSelfScore: (a.overallSelfScore as number) ?? null,
      reflection: (a.reflection as string) || null,
      createdAt: a.createdAt as string,
    }));

    return NextResponse.json({
      essay: {
        id: essay.id as string,
        studentId: essay.studentId as string,
        title: essay.title as string,
        content: essay.content as string,
        topic: (essay.topic as string) || null,
        correctedContent: (essay.correctedContent as string) || null,
        score: (essay.score as number) ?? null,
        grammarScore: (essay.grammarScore as number) ?? null,
        coherenceScore: (essay.coherenceScore as number) ?? null,
        vocabularyScore: (essay.vocabularyScore as number) ?? null,
        clarityScore: (essay.clarityScore as number) ?? null,
        aiFeedback: (essay.aiFeedback as string) || null,
        errorAnnotations: (essay.errorAnnotations as string) || null,
        errors: parseJsonField(essay.errors),
        cilsLevelAssessment: parseJsonField(essay.cilsLevelAssessment),
        status: essay.status as string,
        createdAt: essay.createdAt as string,
        updatedAt: essay.updatedAt as string,
        studentName: (student?.name as string) || 'Sconosciuto',
        selfAssessments,
      },
    });
  } catch (error) {
    console.error('Get essay error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
