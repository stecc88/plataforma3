import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { userOps, generateTeacherCode } from '@/lib/db';

// POST /api/admin/approve-teacher - Approve a pending teacher
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, 'ADMIN');
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId è obbligatorio' },
        { status: 400 }
      );
    }

    const existingUser = await userOps.findUnique({ where: { id: userId } });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Utente non trovato' },
        { status: 404 }
      );
    }

    if (existingUser.role as string !== 'TEACHER') {
      return NextResponse.json(
        { error: 'L\'utente non è un docente' },
        { status: 400 }
      );
    }

    if (existingUser.status as string !== 'PENDING') {
      return NextResponse.json(
        { error: 'Il docente non è in stato PENDING' },
        { status: 400 }
      );
    }

    const teacherCode = (existingUser.teacherCode as string) || generateTeacherCode();

    const updatedUser = await userOps.update({
      where: { id: userId },
      data: {
        status: 'ACTIVE',
        teacherCode,
      },
    });

    return NextResponse.json({
      user: {
        id: updatedUser.id as string,
        email: updatedUser.email as string,
        name: updatedUser.name as string,
        role: updatedUser.role as string,
        status: updatedUser.status as string,
        institution: updatedUser.institution as string || null,
        teacherCode: updatedUser.teacherCode as string || null,
        createdAt: updatedUser.createdAt as string,
      },
    });
  } catch (error) {
    console.error('Approve teacher error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
