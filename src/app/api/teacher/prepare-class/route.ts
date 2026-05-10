import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { classPreparationOps, enrollmentOps, essayOps } from '@/lib/db';
import { generateClassPreparation } from '@/lib/ai';
import crypto from 'crypto';

// POST /api/teacher/prepare-class — Generate lesson plan with Gemini AI
// TEACHER only.
// Body: { topic, level, title?, studentIds? (for personalized content) }
// Returns the generated preparation and saves it.
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, 'TEACHER');
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { topic, level, title, studentIds } = body;

    if (!topic) {
      return NextResponse.json(
        { error: 'L\'argomento è obbligatorio' },
        { status: 400 }
      );
    }

    // Validate level if provided
    const validLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'principiante', 'intermedio', 'avanzato'];
    const preparationLevel = level && validLevels.includes(level) ? level : 'intermedio';

    // If studentIds provided, collect their performance data for personalization
    let personalizationContext = '';
    if (Array.isArray(studentIds) && studentIds.length > 0) {
      // Verify all students are enrolled
      const enrollments = await enrollmentOps.findMany({
        where: { teacherId: user.userId },
      });
      const enrolledIds = new Set(enrollments.map((e) => e.studentId as string));

      const validStudentIds = studentIds.filter((id: string) => enrolledIds.has(id));

      if (validStudentIds.length > 0) {
        // Get recent essays for these students to understand their level
        const recentEssays = await essayOps.findMany({
          where: { studentId: { in: validStudentIds }, status: 'CORRECTED' },
          orderBy: { column: 'createdAt', ascending: false },
          limit: 10,
        });

        if (recentEssays.length > 0) {
          const avgScore = Math.round(
            (recentEssays
              .map((e) => e.score as number)
              .filter((s): s is number => s != null)
              .reduce((a, b) => a + b, 0) / recentEssays.length) * 10
          ) / 10;

          // Extract CILS levels
          const cilsLevels: string[] = [];
          for (const e of recentEssays) {
            if (e.cilsLevelAssessment) {
              try {
                const cils = typeof e.cilsLevelAssessment === 'string'
                  ? JSON.parse(e.cilsLevelAssessment)
                  : e.cilsLevelAssessment;
                if (cils?.estimatedLevel) cilsLevels.push(cils.estimatedLevel);
              } catch {
                // ignore
              }
            }
          }

          personalizationContext = `\n\nCONTESTO PERSONALIZZATO:
- Numero studenti: ${validStudentIds.length}
- Punteggio medio recente: ${avgScore}/10
- Livelli CILS rilevati: ${cilsLevels.length > 0 ? [...new Set(cilsLevels)].join(', ') : 'non disponibili'}
- Adatta la lezione al livello effettivo degli studenti e includi attività differenziate se necessario.`;
        }
      }
    }

    // Generate preparation content with AI
    const content = await generateClassPreparation(
      `${topic}${personalizationContext}`,
      preparationLevel
    );

    const prepTitle = title || `Lezione: ${topic}`;
    const prepId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Save the generated preparation
    const preparation = await classPreparationOps.create({
      data: {
        id: prepId,
        teacherId: user.userId,
        title: prepTitle,
        topic,
        content,
        createdAt: now,
        updatedAt: now,
      },
    });

    return NextResponse.json(
      {
        preparation: {
          id: preparation.id as string,
          teacherId: preparation.teacherId as string,
          title: preparation.title as string,
          topic: preparation.topic as string,
          content: preparation.content as string,
          createdAt: preparation.createdAt as string,
          updatedAt: preparation.updatedAt as string,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Prepare class error:', error);
    return NextResponse.json(
      { error: 'Errore nella generazione della preparazione' },
      { status: 500 }
    );
  }
}
