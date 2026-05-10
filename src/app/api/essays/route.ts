import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, requireRole } from '@/lib/auth';
import { essayOps, enrollmentOps, userOps, selfAssessmentOps } from '@/lib/db';
import crypto from 'crypto';

/** Helper: safely parse JSON fields stored as strings in the DB */
function parseJsonField(value: unknown): unknown {
  if (!value) return null;
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return null; }
  }
  return value;
}

// GET /api/essays — List essays with pagination and self_assessment included
// Query params: studentId, page (default 1), limit (default 20)
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;
    const studentIdFilter = searchParams.get('studentId');

    let where: Record<string, unknown> = {};

    if (user.role === 'STUDENT') {
      // Student can only see their own essays
      where.studentId = user.userId;
      // Override studentIdFilter — student cannot see other students' essays
    } else if (user.role === 'TEACHER') {
      // Teacher sees essays from enrolled students
      const enrollments = await enrollmentOps.findMany({
        where: { teacherId: user.userId },
      });
      const enrolledStudentIds = enrollments.map((e) => e.studentId as string);

      if (studentIdFilter) {
        // Teacher filtering by specific student — verify enrollment
        if (!enrolledStudentIds.includes(studentIdFilter)) {
          return NextResponse.json(
            { error: 'Non sei autorizzato a vedere i temi di questo studente' },
            { status: 403 }
          );
        }
        where.studentId = studentIdFilter;
      } else {
        if (enrolledStudentIds.length === 0) {
          return NextResponse.json({ essays: [], pagination: { page, limit, total: 0, totalPages: 0 } });
        }
        where.studentId = { in: enrolledStudentIds };
      }
    } else {
      // ADMIN: all essays, optional studentId filter
      if (studentIdFilter) {
        where.studentId = studentIdFilter;
      }
    }

    // Get total count for pagination
    const total = await essayOps.count({ where });
    const totalPages = Math.ceil(total / limit);

    // Get essays with pagination
    const essays = await essayOps.findMany({
      where,
      orderBy: { column: 'createdAt', ascending: false },
      limit,
      offset,
    });

    // Enrich with student names
    const studentIds = [...new Set(essays.map((e) => e.studentId as string))];
    const students = await userOps.findMany({
      where: { id: { in: studentIds } },
    });
    const studentMap = new Map(
      students.map((s) => [s.id as string, s.name as string])
    );

    // Get self-assessments for these essays
    const essayIds = essays.map((e) => e.id as string);
    const allAssessments = essayIds.length > 0
      ? await selfAssessmentOps.findMany({
          where: { essayId: { in: essayIds } },
        })
      : [];
    const assessmentMap = new Map<string, unknown[]>();
    for (const a of allAssessments) {
      const eid = a.essayId as string;
      if (!assessmentMap.has(eid)) assessmentMap.set(eid, []);

      // Try to parse reflective data from reflection field
      let reflectiveData = null;
      if (a.reflection) {
        try {
          const parsed = JSON.parse(a.reflection as string);
          if (parsed.version === 2) {
            reflectiveData = parsed;
          }
        } catch {
          // Not JSON, legacy text
        }
      }

      assessmentMap.get(eid)!.push({
        id: a.id as string,
        essayId: a.essayId as string,
        studentId: a.studentId as string,
        clarity: a.clarity as number,
        coherence: a.coherence as number,
        grammar: a.grammar as number,
        vocabulary: a.vocabulary as number,
        overallSelfScore: (a.overallSelfScore as number) ?? null,
        reflection: (a.reflection as string) || null,
        reflectiveData,
        createdAt: a.createdAt as string,
      });
    }

    const enriched = essays.map((essay) => ({
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
      studyTopics: parseJsonField(essay.studyTopics),
      status: essay.status as string,
      createdAt: essay.createdAt as string,
      updatedAt: essay.updatedAt as string,
      studentName: studentMap.get(essay.studentId as string) || 'Sconosciuto',
      selfAssessments: assessmentMap.get(essay.id as string) || [],
    }));

    return NextResponse.json({
      essays: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('List essays error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// POST /api/essays — Create essay (only STUDENT)
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, 'STUDENT');
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { title, content, topic, targetLevel } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Titolo e contenuto sono obbligatori' },
        { status: 400 }
      );
    }

    if (content.length > 50000) {
      return NextResponse.json(
        { error: 'Il contenuto è troppo lungo (massimo 50.000 caratteri)' },
        { status: 400 }
      );
    }

    const essayId = crypto.randomUUID();
    const now = new Date().toISOString();

    const essay = await essayOps.create({
      data: {
        id: essayId,
        studentId: user.userId,
        title,
        content,
        topic: topic || null,
        status: 'SUBMITTED',
        createdAt: now,
        updatedAt: now,
      },
    });

    // Get student name
    const student = await userOps.findUnique({
      where: { id: user.userId },
    });

    return NextResponse.json(
      {
        essay: {
          id: essay.id as string,
          studentId: essay.studentId as string,
          title: essay.title as string,
          content: essay.content as string,
          topic: (essay.topic as string) || null,
          status: essay.status as string,
          createdAt: essay.createdAt as string,
          updatedAt: essay.updatedAt as string,
          studentName: (student?.name as string) || 'Sconosciuto',
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create essay error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
