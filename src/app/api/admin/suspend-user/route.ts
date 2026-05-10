import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { userOps } from '@/lib/db';

// POST /api/admin/suspend-user - Suspend or reactivate a user (ADMIN only)
// - Cannot suspend yourself (no auto-suspend)
// - Cannot suspend another ADMIN
// - Action: "suspend" or "reactivate"
export async function POST(request: NextRequest) {
  try {
    const user = await requireRole(request, 'ADMIN');
    if (user instanceof NextResponse) return user;

    const body = await request.json();
    const { userId, action } = body;

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'userId e action sono obbligatori' },
        { status: 400 }
      );
    }

    if (!['suspend', 'reactivate'].includes(action)) {
      return NextResponse.json(
        { error: 'Action deve essere "suspend" o "reactivate"' },
        { status: 400 }
      );
    }

    // Prevent admins from suspending themselves
    if (userId === user.userId) {
      return NextResponse.json(
        { error: 'Non puoi sospendere il tuo stesso account' },
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

    // Prevent suspending other admins
    if (existingUser.role as string === 'ADMIN') {
      return NextResponse.json(
        { error: 'Non puoi sospendere un altro amministratore' },
        { status: 403 }
      );
    }

    if (action === 'suspend' && existingUser.status as string === 'SUSPENDED') {
      return NextResponse.json(
        { error: 'L\'utente è già sospeso' },
        { status: 400 }
      );
    }

    if (action === 'reactivate' && existingUser.status as string === 'ACTIVE') {
      return NextResponse.json(
        { error: 'L\'utente è già attivo' },
        { status: 400 }
      );
    }

    const newStatus = action === 'suspend' ? 'SUSPENDED' : 'ACTIVE';

    const updatedUser = await userOps.update({
      where: { id: userId },
      data: { status: newStatus },
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
    console.error('Suspend user error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
