import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { userOps, enrollmentOps } from '@/lib/db';

// GET /api/auth/me — Get current authenticated user + related students/teachers
//
// Returns:
//   user: { id, email, name, role, status, teacherCode, institution, avatar }
//   relatedStudents: (TEACHER only) students enrolled with this teacher
//   relatedTeachers: (STUDENT only) teachers this student is enrolled with
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (user instanceof NextResponse) return user;

    // Fetch fresh user data from DB to ensure status is current
    const dbUser = await userOps.findUnique({ where: { id: user.userId } });

    if (!dbUser) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      );
    }

    // Re-check status from DB (could have been suspended since token was issued)
    if ((dbUser.status as string) === 'SUSPENDED') {
      return NextResponse.json(
        { error: 'Account sospeso. Contatta l\'amministratore.' },
        { status: 403 }
      );
    }

    // PENDING teachers should not access the app
    if ((dbUser.status as string) === 'PENDING') {
      return NextResponse.json(
        { error: 'Il tuo account docente è in attesa di approvazione.' },
        { status: 403 }
      );
    }

    const userData = {
      id: dbUser.id as string,
      email: dbUser.email as string,
      name: dbUser.name as string,
      role: dbUser.role as string,
      status: dbUser.status as string,
      teacherCode: (dbUser.teacherCode as string) || null,
      institution: (dbUser.institution as string) || null,
      avatar: (dbUser.avatar as string) || null,
    };

    // Build related data based on role
    let relatedStudents: unknown[] = [];
    let relatedTeachers: unknown[] = [];

    if ((dbUser.role as string) === 'TEACHER') {
      // Get enrolled students
      const enrollments = await enrollmentOps.findMany({
        where: { teacherId: user.userId },
      });
      const studentIds = enrollments.map((e) => e.studentId as string);

      if (studentIds.length > 0) {
        const students = await userOps.findMany({
          where: { id: { in: studentIds } },
          select: ['id', 'name', 'email', 'institution', 'avatar'],
        });
        relatedStudents = students.map((s) => ({
          id: s.id as string,
          name: s.name as string,
          email: s.email as string,
          institution: (s.institution as string) || null,
          avatar: (s.avatar as string) || null,
        }));
      }
    } else if ((dbUser.role as string) === 'STUDENT') {
      // Get enrolled teachers
      const enrollments = await enrollmentOps.findMany({
        where: { studentId: user.userId },
      });
      const teacherIds = enrollments.map((e) => e.teacherId as string);

      if (teacherIds.length > 0) {
        const teachers = await userOps.findMany({
          where: { id: { in: teacherIds } },
          select: ['id', 'name', 'email', 'institution', 'teacherCode', 'avatar'],
        });
        relatedTeachers = teachers.map((t) => ({
          id: t.id as string,
          name: t.name as string,
          email: t.email as string,
          institution: (t.institution as string) || null,
          teacherCode: (t.teacherCode as string) || null,
          avatar: (t.avatar as string) || null,
        }));
      }
    }

    return NextResponse.json({
      user: userData,
      relatedStudents,
      relatedTeachers,
    });
  } catch (error) {
    console.error('Get me error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
