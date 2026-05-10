import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, requireRole } from '@/lib/auth';
import { enrollmentOps, userOps, generateTeacherCode } from '@/lib/db';
import crypto from 'crypto';

// GET /api/enrollments - List enrollments
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (user instanceof NextResponse) return user;

    if (user.role === 'STUDENT') {
      const enrollments = await enrollmentOps.findMany({
        where: { studentId: user.userId },
      });

      // Enrich with teacher names
      const teacherIds = [...new Set(enrollments.map((e) => e.teacherId as string))];
      const teachers = await userOps.findMany({
        where: { id: { in: teacherIds } },
      });
      const teacherMap = new Map(
        teachers.map((t) => [t.id as string, t.name as string])
      );

      const enriched = enrollments.map((en) => ({
        id: en.id as string,
        teacherId: en.teacherId as string,
        studentId: en.studentId as string,
        joinedAt: en.joinedAt as string,
        teacherName: teacherMap.get(en.teacherId as string) || 'Sconosciuto',
      }));

      return NextResponse.json({ enrollments: enriched });
    } else if (user.role === 'TEACHER') {
      const enrollments = await enrollmentOps.findMany({
        where: { teacherId: user.userId },
      });

      // Enrich with student names
      const studentIds = [...new Set(enrollments.map((e) => e.studentId as string))];
      const students = await userOps.findMany({
        where: { id: { in: studentIds } },
      });
      const studentMap = new Map(
        students.map((s) => [s.id as string, s.name as string])
      );

      const enriched = enrollments.map((en) => ({
        id: en.id as string,
        teacherId: en.teacherId as string,
        studentId: en.studentId as string,
        joinedAt: en.joinedAt as string,
        studentName: studentMap.get(en.studentId as string) || 'Sconosciuto',
      }));

      return NextResponse.json({ enrollments: enriched });
    }

    return NextResponse.json({ enrollments: [] });
  } catch (error) {
    console.error('List enrollments error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// POST /api/enrollments - Enroll student with teacher
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, 'STUDENT');
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { teacherCode } = body;

    if (!teacherCode) {
      return NextResponse.json(
        { error: 'Il codice docente è obbligatorio' },
        { status: 400 }
      );
    }

    // Find teacher by code
    const teacher = await userOps.findUnique({
      where: { teacherCode, role: 'TEACHER' },
    });

    if (!teacher) {
      return NextResponse.json(
        { error: 'Codice docente non valido' },
        { status: 404 }
      );
    }

    // Check if already enrolled
    const existing = await enrollmentOps.findUnique({
      where: { studentId: user.userId, teacherId: teacher.id as string },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Sei già iscritto a questo docente' },
        { status: 409 }
      );
    }

    const enrollmentId = crypto.randomUUID();
    const now = new Date().toISOString();

    const enrollment = await enrollmentOps.create({
      data: {
        id: enrollmentId,
        teacherId: teacher.id as string,
        studentId: user.userId,
        joinedAt: now,
      },
    });

    return NextResponse.json(
      {
        enrollment: {
          id: enrollment.id as string,
          teacherId: enrollment.teacherId as string,
          studentId: enrollment.studentId as string,
          joinedAt: enrollment.joinedAt as string,
          teacherName: teacher.name as string,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Enroll error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
