import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { classPreparationOps } from '@/lib/db';
import crypto from 'crypto';

// GET /api/preparations - List class preparations
export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(request, 'TEACHER');
    if (user instanceof NextResponse) return user;

    const preparations = await classPreparationOps.findMany({
      where: { teacherId: user.userId },
      orderBy: { column: 'createdAt', ascending: false },
    });

    const enriched = preparations.map((prep) => ({
      id: prep.id,
      teacherId: prep.teacherId,
      title: prep.title,
      topic: prep.topic,
      content: prep.content,
      createdAt: prep.createdAt,
      updatedAt: prep.updatedAt,
    }));

    return NextResponse.json({ preparations: enriched });
  } catch (error) {
    console.error('List preparations error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}

// POST /api/preparations - Create class preparation
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, 'TEACHER');
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { title, topic, content } = body;

    if (!title || !topic || !content) {
      return NextResponse.json(
        { error: 'title, topic e content sono obbligatori' },
        { status: 400 }
      );
    }

    const prepId = crypto.randomUUID();
    const now = new Date().toISOString();

    const prep = await classPreparationOps.create({
      data: {
        id: prepId,
        teacherId: user.userId,
        title,
        topic,
        content,
        createdAt: now,
        updatedAt: now,
      },
    });

    return NextResponse.json(
      {
        preparation: {
          id: prep.id,
          teacherId: prep.teacherId,
          title: prep.title,
          topic: prep.topic,
          content: prep.content,
          createdAt: prep.createdAt,
          updatedAt: prep.updatedAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create preparation error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
