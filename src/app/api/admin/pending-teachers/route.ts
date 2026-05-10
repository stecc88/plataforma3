import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { userOps } from '@/lib/db';

// GET /api/admin/pending-teachers - Returns teachers with PENDING status
export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(request, 'ADMIN');
    if (user instanceof NextResponse) return user;

    const teachers = await userOps.findMany({
      where: { role: 'TEACHER', status: 'PENDING' },
      orderBy: { column: 'createdAt', ascending: false },
      select: ['id', 'email', 'name', 'role', 'status', 'institution', 'teacherCode', 'createdAt'],
    });

    const pendingTeachers = teachers.map((t) => ({
      id: t.id as string,
      email: t.email as string,
      name: t.name as string,
      role: t.role as string,
      status: t.status as string,
      institution: t.institution as string || null,
      teacherCode: t.teacherCode as string || null,
      createdAt: t.createdAt as string,
    }));

    return NextResponse.json({ pendingTeachers });
  } catch (error) {
    console.error('Pending teachers error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
