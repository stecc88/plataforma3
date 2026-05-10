import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { essayOps, enrollmentOps, selfAssessmentOps, teacherNoteOps, classPreparationOps } from '@/lib/db';

// GET /api/stats - Dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (user instanceof NextResponse) return user;

    if (user.role === 'STUDENT') {
      const totalEssays = await essayOps.count({ where: { studentId: user.userId } });
      const correctedEssays = await essayOps.count({ where: { studentId: user.userId, status: 'CORRECTED' } });
      const submittedEssays = await essayOps.count({ where: { studentId: user.userId, status: 'SUBMITTED' } });

      // Get corrected essays with scores for average and trend
      const correctedEssayList = await essayOps.findMany({
        where: { studentId: user.userId, status: 'CORRECTED' },
        orderBy: { column: 'createdAt', ascending: true },
      });

      const scores = correctedEssayList
        .map((e) => e.score as number)
        .filter((s): s is number => s != null);

      const avgScore =
        scores.length > 0
          ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
          : null;

      // Calculate trend (difference between last two scores)
      let trend: number | null = null;
      if (scores.length >= 2) {
        trend = Math.round((scores[scores.length - 1] - scores[scores.length - 2]) * 10) / 10;
      }

      // Self assessments stats
      const totalAssessments = await selfAssessmentOps.count({ where: { studentId: user.userId } });
      const assessmentList = await selfAssessmentOps.findMany({
        where: { studentId: user.userId },
      });

      const averageSelfScore = assessmentList.length > 0
        ? Math.round((assessmentList.reduce((s, a) => s + ((a.overallSelfScore as number) || 0), 0) / assessmentList.length) * 10) / 10
        : null;

      const enrolledTeachers = await enrollmentOps.count({ where: { studentId: user.userId } });

      return NextResponse.json({
        stats: {
          role: 'STUDENT',
          totalEssays,
          averageScore: avgScore,
          correctedEssays,
          submittedEssays,
          trend,
          averageSelfScore,
          totalAssessments,
          enrolledTeachers,
        },
      });
    } else if (user.role === 'TEACHER') {
      // Get enrolled students
      const enrollments = await enrollmentOps.findMany({
        where: { teacherId: user.userId },
      });
      const studentIds = enrollments.map((e) => e.studentId as string);
      const totalStudents = studentIds.length;

      let totalEssays = 0;
      let correctedEssays = 0;
      let submittedEssays = 0;
      let avgScore: number | null = null;

      if (studentIds.length > 0) {
        totalEssays = await essayOps.count({ where: { studentId: { in: studentIds } } });
        correctedEssays = await essayOps.count({ where: { studentId: { in: studentIds }, status: 'CORRECTED' } });
        submittedEssays = await essayOps.count({ where: { studentId: { in: studentIds }, status: 'SUBMITTED' } });

        // Get scores for average
        const correctedEssayList = await essayOps.findMany({
          where: { studentId: { in: studentIds }, status: 'CORRECTED' },
        });
        const scores = correctedEssayList
          .map((e) => e.score as number)
          .filter((s): s is number => s != null);
        avgScore = scores.length > 0
          ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
          : null;
      }

      const totalNotes = await teacherNoteOps.count({ where: { teacherId: user.userId } });
      const totalPreparations = await classPreparationOps.count({ where: { teacherId: user.userId } });

      return NextResponse.json({
        stats: {
          role: 'TEACHER',
          totalStudents,
          totalEssays,
          correctedEssays,
          submittedEssays,
          essaysToReview: submittedEssays,
          averageScore: avgScore,
          averageClassScore: avgScore,
          totalNotes,
          totalPreparations,
        },
      });
    }

    return NextResponse.json({ stats: {} });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
