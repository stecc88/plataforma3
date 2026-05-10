import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { teacherNoteOps, enrollmentOps, userOps } from '@/lib/db';
import crypto from 'crypto';

// POST /api/teacher/notes — Create or update a note about a student
// TEACHER only. If a note already exists for this teacher+student, update it.
// Body: { studentId, content }
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

    if (typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Il contenuto della nota non può essere vuoto' },
        { status: 400 }
      );
    }

    if (content.length > 5000) {
      return NextResponse.json(
        { error: 'La nota non può superare i 5000 caratteri' },
        { status: 400 }
      );
    }

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

    // Verify student exists
    const student = await userOps.findUnique({ where: { id: studentId } });
    if (!student) {
      return NextResponse.json(
        { error: 'Studente non trovato' },
        { status: 404 }
      );
    }

    // Check if a note already exists for this teacher+student
    const existingNote = await teacherNoteOps.findUnique({
      where: { teacherId: user.userId, studentId },
    });

    const now = new Date().toISOString();

    if (existingNote) {
      // Update existing note
      const updated = await teacherNoteOps.update({
        where: { id: existingNote.id as string },
        data: {
          content: content.trim(),
          updatedAt: now,
        },
      });

      return NextResponse.json({
        note: {
          id: updated.id as string,
          teacherId: updated.teacherId as string,
          studentId: updated.studentId as string,
          content: updated.content as string,
          createdAt: updated.createdAt as string,
          updatedAt: updated.updatedAt as string,
          studentName: student.name as string,
        },
        updated: true,
      });
    }

    // Create new note
    const noteId = crypto.randomUUID();

    const note = await teacherNoteOps.create({
      data: {
        id: noteId,
        teacherId: user.userId,
        studentId,
        content: content.trim(),
        createdAt: now,
        updatedAt: now,
      },
    });

    return NextResponse.json(
      {
        note: {
          id: note.id as string,
          teacherId: note.teacherId as string,
          studentId: note.studentId as string,
          content: note.content as string,
          createdAt: note.createdAt as string,
          updatedAt: note.updatedAt as string,
          studentName: student.name as string,
        },
        updated: false,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create/update note error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
