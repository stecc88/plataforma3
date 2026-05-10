// ─────────────────────────────────────────────────────────────
// ScribIA — JWT Authentication Module (jose + bcryptjs)
// ─────────────────────────────────────────────────────────────
//
// Token payload: { userId, email, role, status }
// Expiration: 7 days
// Algorithm: HS256
// Passwords: bcryptjs (12 rounds)
// ─────────────────────────────────────────────────────────────

import { SignJWT, jwtVerify } from 'jose';
import { hash, compare } from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable is required in production');
    }
    return 'scribia-dev-secret-key-not-for-production';
  })()
);

// ─── JWT Payload Interface ───────────────────────────────────

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  status: string;
}

// ─── Password Hashing ────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return compare(password, hashedPassword);
}

// ─── JWT Sign & Verify ──────────────────────────────────────

export async function signToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

// ─── Token Extraction ───────────────────────────────────────

export function getTokenFromHeaders(headers: Headers): string | null {
  const auth = headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    return auth.substring(7);
  }
  return null;
}

// ─── getAuthUser — Main auth verification function ──────────
//
// Returns the verified JWT payload or a NextResponse error.
// Usage in API routes:
//   const user = await getAuthUser(request);
//   if (user instanceof NextResponse) return user;
//   // user is now JWTPayload with { userId, email, role, status }
// ─────────────────────────────────────────────────────────────

export async function getAuthUser(request: NextRequest): Promise<JWTPayload | NextResponse> {
  const token = getTokenFromHeaders(request.headers);
  if (!token) {
    return NextResponse.json(
      { error: 'Token non fornito' },
      { status: 401 }
    );
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json(
      { error: 'Token non valido o scaduto' },
      { status: 401 }
    );
  }

  // Check if user status in token is SUSPENDED
  if (payload.status === 'SUSPENDED') {
    return NextResponse.json(
      { error: 'Account sospeso. Contatta l\'amministratore.' },
      { status: 403 }
    );
  }

  return payload;
}

// ─── requireRole — Role-based access guard ──────────────────
//
// Combines getAuthUser with role checking.
// Usage in API routes:
//   const user = await requireRole(request, 'TEACHER');
//   if (user instanceof NextResponse) return user;
//   // user is now JWTPayload with guaranteed role
// ─────────────────────────────────────────────────────────────

export async function requireRole(
  request: NextRequest,
  ...allowedRoles: string[]
): Promise<JWTPayload | NextResponse> {
  const user = await getAuthUser(request);
  if (user instanceof NextResponse) return user;

  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json(
      { error: 'Accesso non autorizzato. Ruolo insufficiente.' },
      { status: 403 }
    );
  }

  return user;
}
