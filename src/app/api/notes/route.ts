import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { teacherNoteOps, userOps } from '@/lib/db';
import crypto from 'crypto';

// GET /api/notes - List teacher notes
export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(request, 'TEACHER');
    if (user instanceof NextResponse) return user;

    const notes = await teacherNoteOps.findMany({
      where: { teacherId: user.userId },
      orderBy: { column: 'createdAt', ascending: false },
    });

    // Enrich with student names
    const studentIds = [...new Set(notes.map((n) => n.studentId as string))];
    const students = await userOps.findMany({
      where: { id: { in: studentIds } },
    });
    const studentMap = new Map(
      students.map((s) => [s.id as string, s.name as string])
    );

    const enriched = notes.map((note) => ({
      id: note.id,
      teacherId: note.teacherId,
      studentId: note.studentId,
      content: note.content,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      studentName: studentMap.get(note.studentId as string) || 'Sconosciuto',
    }));

    return NextResponse.json({ notes: enriched });
  } catch (error) {
    console.error('List notes error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// POST /api/notes - Create teacher note
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, 'TEACHER');
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { studentId, content } = body;

    if (!studentId || !content) {
      return NextResponse.json(
        { error: 'studentId e content sono obbligatori' },
        { status: 400 }
      );
    }

    // Verify student exists
    const student = await userOps.findUnique({ where: { id: studentId } });
    if (!student) {
      return NextResponse.json(
        { error: 'Studente non trovato' },
        { status: 404 }
      );
    }

    const noteId = crypto.randomUUID();
    const now = new Date().toISOString();

    const note = await teacherNoteOps.create({
      data: {
        id: noteId,
        teacherId: user.userId,
        studentId,
        content,
        createdAt: now,
        updatedAt: now,
      },
    });

    return NextResponse.json(
      {
        note: {
          id: note.id,
          teacherId: note.teacherId,
          studentId: note.studentId,
          content: note.content,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          studentName: student.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create note error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
