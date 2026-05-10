import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { enrollmentOps, userOps, essayOps, selfAssessmentOps } from '@/lib/db';

// GET /api/teacher/students — List enrolled students with statistics
// TEACHER only. Returns students enrolled with the authenticated teacher.
export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(request, 'TEACHER');
    if (user instanceof NextResponse) return user;

    // Get enrolled students for this teacher
    const enrollments = await enrollmentOps.findMany({
      where: { teacherId: user.userId },
    });

    if (enrollments.length === 0) {
      return NextResponse.json({ students: [] });
    }

    const studentIds = enrollments.map((e) => e.studentId as string);

    // Fetch student user data
    const students = await userOps.findMany({
      where: { id: { in: studentIds } },
      select: ['id', 'name', 'email', 'institution', 'avatar', 'createdAt'],
    });

    // Fetch essays for all enrolled students
    const essays = studentIds.length > 0
      ? await essayOps.findMany({
          where: { studentId: { in: studentIds } },
          orderBy: { column: 'createdAt', ascending: false },
        })
      : [];

    // Fetch self-assessments
    const allAssessments = studentIds.length > 0
      ? await selfAssessmentOps.findMany({
          where: { studentId: { in: studentIds } },
        })
      : [];

    // Build per-student stats
    const studentStatsMap = new Map<string, {
      totalEssays: number;
      correctedEssays: number;
      submittedEssays: number;
      scores: number[];
      lastEssayDate: string | null;
      lastCilsLevel: string | null;
      selfAssessmentCount: number;
    }>();

    for (const sid of studentIds) {
      studentStatsMap.set(sid, {
        totalEssays: 0,
        correctedEssays: 0,
        submittedEssays: 0,
        scores: [],
        lastEssayDate: null,
        lastCilsLevel: null,
        selfAssessmentCount: 0,
      });
    }

    // Process essays
    for (const essay of essays) {
      const sid = essay.studentId as string;
      const stats = studentStatsMap.get(sid);
      if (!stats) continue;

      stats.totalEssays++;

      if (essay.status as string === 'CORRECTED') {
        stats.correctedEssays++;
        if (essay.score != null) {
          stats.scores.push(essay.score as number);
        }
        // Extract CILS level from the most recent corrected essay
        if (!stats.lastCilsLevel && essay.cilsLevelAssessment) {
          try {
            const cils = typeof essay.cilsLevelAssessment === 'string'
              ? JSON.parse(essay.cilsLevelAssessment)
              : essay.cilsLevelAssessment;
            if (cils?.estimatedLevel) {
              stats.lastCilsLevel = cils.estimatedLevel;
            }
          } catch {
            // ignore parse errors
          }
        }
      } else if (essay.status as string === 'SUBMITTED') {
        stats.submittedEssays++;
      }

      // Track most recent essay date
      const essayDate = essay.createdAt as string;
      if (!stats.lastEssayDate || essayDate > stats.lastEssayDate) {
        stats.lastEssayDate = essayDate;
      }
    }

    // Process self-assessments
    for (const a of allAssessments) {
      const sid = a.studentId as string;
      const stats = studentStatsMap.get(sid);
      if (stats) {
        stats.selfAssessmentCount++;
      }
    }

    // Compose response
    const enrichedStudents = students.map((s) => {
      const stats = studentStatsMap.get(s.id as string) || {
        totalEssays: 0,
        correctedEssays: 0,
        submittedEssays: 0,
        scores: [],
        lastEssayDate: null,
        lastCilsLevel: null,
        selfAssessmentCount: 0,
      };

      const avgScore = stats.scores.length > 0
        ? Math.round((stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length) * 10) / 10
        : null;

      return {
        id: s.id as string,
        name: s.name as string,
        email: s.email as string,
        institution: (s.institution as string) || null,
        avatar: (s.avatar as string) || null,
        joinedAt: (enrollments.find((e) => e.studentId as string === s.id as string)?.joinedAt as string) || null,
        stats: {
          totalEssays: stats.totalEssays,
          correctedEssays: stats.correctedEssays,
          submittedEssays: stats.submittedEssays,
          averageScore: avgScore,
          lastEssayDate: stats.lastEssayDate,
          lastCilsLevel: stats.lastCilsLevel,
          selfAssessmentCount: stats.selfAssessmentCount,
        },
      };
    });

    // Sort by name
    enrichedStudents.sort((a, b) => (a.name as string).localeCompare(b.name as string));

    return NextResponse.json({ students: enrichedStudents });
  } catch (error) {
    console.error('Teacher students error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
