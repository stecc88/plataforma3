import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, signToken } from '@/lib/auth';
import { userOps, dbIsDemoMode } from '@/lib/db';

// POST /api/auth/login — Verify credentials, return JWT
// - STUDENT/ADMIN with ACTIVE status: allow login
// - TEACHER with PENDING status: blocked (needs admin approval)
// - Any user with SUSPENDED status: blocked
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e password sono obbligatori' },
        { status: 400 }
      );
    }

    const user = await userOps.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json(
        { error: 'Credenziali non valide' },
        { status: 401 }
      );
    }

    // Check status
    const userStatus = user.status as string;
    if (userStatus === 'SUSPENDED') {
      return NextResponse.json(
        { error: 'Account sospeso. Contatta l\'amministratore.' },
        { status: 403 }
      );
    }

    // TEACHER with PENDING status cannot log in until approved by admin
    if (userStatus === 'PENDING') {
      return NextResponse.json(
        { error: 'Il tuo account docente è in attesa di approvazione da parte di un amministratore. Riceverai un\'email quando il tuo account sarà attivato.' },
        { status: 403 }
      );
    }

    // In demo mode, demo accounts accept any password
    let passwordValid = false;
    if (dbIsDemoMode() && (user.passwordHash as string) === '$2a$12$placeholderhashfordemo') {
      passwordValid = true;
    } else {
      passwordValid = await verifyPassword(password, user.passwordHash as string);
    }

    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Credenziali non valide' },
        { status: 401 }
      );
    }

    const token = await signToken({
      userId: user.id as string,
      email: user.email as string,
      role: user.role as string,
      status: user.status as string,
    });

    return NextResponse.json({
      token,
      user: {
        id: user.id as string,
        email: user.email as string,
        name: user.name as string,
        role: user.role as string,
        status: user.status as string,
        teacherCode: (user.teacherCode as string) || null,
        institution: (user.institution as string) || null,
        avatar: (user.avatar as string) || null,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
