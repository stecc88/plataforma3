import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, signToken } from '@/lib/auth';
import { userOps, enrollmentOps, generateTeacherCode } from '@/lib/db';
import crypto from 'crypto';

// POST /api/auth/register — Create user
// - Hash password with bcryptjs
// - Generate teacher_code if TEACHER
// - Status: PENDING if TEACHER (needs admin approval), ACTIVE if STUDENT
// - If STUDENT provides teacherCode, auto-enroll with that teacher
// - Return JWT token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, role, institution, teacherCode } = body;

    if (!email || !password || !name || !role) {
      return NextResponse.json(
        { error: 'Email, password, name e role sono obbligatori' },
        { status: 400 }
      );
    }

    if (!['STUDENT', 'TEACHER'].includes(role)) {
      return NextResponse.json(
        { error: 'Role deve essere STUDENT o TEACHER' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'La password deve avere almeno 6 caratteri' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await userOps.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: 'Email già registrata' },
        { status: 409 }
      );
    }

    const userId = crypto.randomUUID();
    const now = new Date().toISOString();
    const passwordHash = await hashPassword(password);

    // TEACHER: generate code + PENDING status (needs admin approval)
    // STUDENT: ACTIVE immediately
    const isTeacher = role === 'TEACHER';
    const autoTeacherCode = isTeacher ? generateTeacherCode() : null;
    const status = isTeacher ? 'PENDING' : 'ACTIVE';

    const newUser = await userOps.create({
      data: {
        id: userId,
        email,
        name,
        role,
        status,
        teacherCode: autoTeacherCode,
        institution: institution || null,
        avatar: null,
        passwordHash,
        createdAt: now,
        updatedAt: now,
      },
    });

    // If STUDENT provided a teacher code, auto-enroll them
    let enrollmentResult: { teacherId: string; teacherName: string } | null = null;
    if (role === 'STUDENT' && teacherCode) {
      try {
        const teacher = await userOps.findUnique({
          where: { teacherCode, role: 'TEACHER' },
        });

        if (teacher && (teacher.status as string) === 'ACTIVE') {
          const existingEnrollment = await enrollmentOps.findUnique({
            where: { studentId: userId, teacherId: teacher.id as string },
          });

          if (!existingEnrollment) {
            await enrollmentOps.create({
              data: {
                id: crypto.randomUUID(),
                teacherId: teacher.id as string,
                studentId: userId,
                joinedAt: now,
              },
            });
            enrollmentResult = {
              teacherId: teacher.id as string,
              teacherName: teacher.name as string,
            };
          }
        }
      } catch (enrollErr) {
        // Don't fail registration if enrollment fails
        console.error('[REGISTER] Auto-enrollment error (non-blocking):', enrollErr);
      }
    }

    const token = await signToken({
      userId: newUser.id as string,
      email: newUser.email as string,
      role: newUser.role as string,
      status: newUser.status as string,
    });

    return NextResponse.json({
      token,
      user: {
        id: newUser.id as string,
        email: newUser.email as string,
        name: newUser.name as string,
        role: newUser.role as string,
        status: newUser.status as string,
        teacherCode: (newUser.teacherCode as string) || null,
        institution: (newUser.institution as string) || null,
        avatar: (newUser.avatar as string) || null,
      },
      enrollment: enrollmentResult,
    });
  } catch (error: unknown) {
    console.error('[REGISTER] Error:', error);
    const message = error instanceof Error ? error.message : 'Errore interno del server';
    return NextResponse.json(
      { error: 'Errore interno del server', detail: message },
      { status: 500 }
    );
  }
}
