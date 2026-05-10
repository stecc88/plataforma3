import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { enrollmentOps, userOps, essayOps, selfAssessmentOps, teacherNoteOps } from '@/lib/db';

/** Helper: safely parse JSON fields stored as strings in the DB */
function parseJsonField(value: unknown): unknown {
  if (!value) return null;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return null; }
  }
  return value;
}

// GET /api/teacher/students/[studentId] — Detailed student profile
// TEACHER only. Returns full student data including essays, notes, and stats.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const user = await requireRole(request, 'TEACHER');
    if (user instanceof NextResponse) return user;

    const { studentId } = await params;

    // Verify this student is enrolled with the teacher
    const enrollment = await enrollmentOps.findUnique({
      where: { studentId, teacherId: user.userId },
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Studente non iscritto al tuo corso' },
        { status: 403 }
      );
    }

    // Fetch student data
    const student = await userOps.findUnique({ where: { id: studentId } });
    if (!student) {
      return NextResponse.json(
        { error: 'Studente non trovato' },
        { status: 404 }
      );
    }

    // Fetch all essays for this student
    const essays = await essayOps.findMany({
      where: { studentId },
      orderBy: { column: 'createdAt', ascending: false },
    });

    // Fetch self-assessments for this student
    const selfAssessments = await selfAssessmentOps.findMany({
      where: { studentId },
    });

    // Fetch notes by this teacher about this student
    const notes = await teacherNoteOps.findMany({
      where: { teacherId: user.userId, studentId },
      orderBy: { column: 'createdAt', ascending: false },
    });

    // Compute detailed stats
    const correctedEssays = essays.filter((e) => e.status as string === 'CORRECTED');
    const scores = correctedEssays
      .map((e) => e.score as number)
      .filter((s): s is number => s != null);

    const avgScore = scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : null;

    // Score trend (last 5 essays)
    const recentScores = scores.slice(0, 5).reverse();
    let trend: number | null = null;
    if (recentScores.length >= 2) {
      const first = recentScores[0];
      const last = recentScores[recentScores.length - 1];
      trend = Math.round((last - first) * 10) / 10;
    }

    // Average sub-scores
    const grammarScores = correctedEssays.map((e) => e.grammarScore as number).filter((s): s is number => s != null);
    const coherenceScores = correctedEssays.map((e) => e.coherenceScore as number).filter((s): s is number => s != null);
    const vocabularyScores = correctedEssays.map((e) => e.vocabularyScore as number).filter((s): s is number => s != null);
    const clarityScores = correctedEssays.map((e) => e.clarityScore as number).filter((s): s is number => s != null);

    const avg = (arr: number[]) => arr.length > 0 ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;

    // CILS level progression
    const cilsProgression = correctedEssays
      .map((e) => {
        const cils = parseJsonField(e.cilsLevelAssessment) as { estimatedLevel?: string; readiness?: string } | null;
        return cils?.estimatedLevel || null;
      })
      .filter((l): l is string => l !== null);

    // Self-assessment averages
    const saScores = selfAssessments.map((a) => ({
      clarity: a.clarity as number,
      coherence: a.coherence as number,
      grammar: a.grammar as number,
      vocabulary: a.vocabulary as number,
      overallSelfScore: a.overallSelfScore as number | null,
    }));

    const avgSelfAssessment = saScores.length > 0
      ? {
          clarity: avg(saScores.map((s) => s.clarity)),
          coherence: avg(saScores.map((s) => s.coherence)),
          grammar: avg(saScores.map((s) => s.grammar)),
          vocabulary: avg(saScores.map((s) => s.vocabulary)),
          overallSelfScore: avg(saScores.map((s) => s.overallSelfScore).filter((s): s is number => s != null)),
        }
      : null;

    // Format essays for response
    const formattedEssays = essays.map((e) => ({
      id: e.id as string,
      title: e.title as string,
      topic: (e.topic as string) || null,
      status: e.status as string,
      score: (e.score as number) ?? null,
      grammarScore: (e.grammarScore as number) ?? null,
      coherenceScore: (e.coherenceScore as number) ?? null,
      vocabularyScore: (e.vocabularyScore as number) ?? null,
      clarityScore: (e.clarityScore as number) ?? null,
      cilsLevelAssessment: parseJsonField(e.cilsLevelAssessment),
      errors: parseJsonField(e.errors),
      createdAt: e.createdAt as string,
      updatedAt: e.updatedAt as string,
      selfAssessment: selfAssessments.find((a) => a.essayId as string === e.id as string)
        ? (() => {
            const a = selfAssessments.find((sa) => sa.essayId as string === e.id as string)!;
            return {
              clarity: a.clarity as number,
              coherence: a.coherence as number,
              grammar: a.grammar as number,
              vocabulary: a.vocabulary as number,
              overallSelfScore: (a.overallSelfScore as number) ?? null,
              reflection: (a.reflection as string) || null,
            };
          })()
        : null,
    }));

    // Format notes
    const formattedNotes = notes.map((n) => ({
      id: n.id as string,
      content: n.content as string,
      createdAt: n.createdAt as string,
      updatedAt: n.updatedAt as string,
    }));

    return NextResponse.json({
      student: {
        id: student.id as string,
        name: student.name as string,
        email: student.email as string,
        institution: (student.institution as string) || null,
        avatar: (student.avatar as string) || null,
        joinedAt: enrollment.joinedAt as string,
      },
      stats: {
        totalEssays: essays.length,
        correctedEssays: correctedEssays.length,
        submittedEssays: essays.filter((e) => e.status as string === 'SUBMITTED').length,
        averageScore: avgScore,
        trend,
        grammarAverage: avg(grammarScores),
        coherenceAverage: avg(coherenceScores),
        vocabularyAverage: avg(vocabularyScores),
        clarityAverage: avg(clarityScores),
        cilsLevelProgression: cilsProgression,
        currentCilsLevel: cilsProgression[0] || null,
        selfAssessmentCount: selfAssessments.length,
        averageSelfAssessment: avgSelfAssessment,
        teacherNotesCount: notes.length,
      },
      essays: formattedEssays,
      notes: formattedNotes,
    });
  } catch (error) {
    console.error('Student profile error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
