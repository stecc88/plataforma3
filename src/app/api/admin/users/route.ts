import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { userOps } from '@/lib/db';

// GET /api/admin/users — List users with search, filters, and pagination (ADMIN only)
// Query params: search, role, status, page (default 1), limit (default 20)
export async function GET(request: NextRequest) {
  try {
    const user = await requireRole(request, 'ADMIN');
    if (user instanceof NextResponse) return user;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim() || '';
    const roleFilter = searchParams.get('role');
    const statusFilter = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    // Build where filter
    const where: Record<string, unknown> = {};
    if (roleFilter && ['STUDENT', 'TEACHER', 'ADMIN'].includes(roleFilter)) {
      where.role = roleFilter;
    }
    if (statusFilter && ['ACTIVE', 'PENDING', 'SUSPENDED'].includes(statusFilter)) {
      where.status = statusFilter;
    }

    // Get total count for pagination (before applying search filter)
    const total = await userOps.count({
      where: Object.keys(where).length > 0 ? where : undefined,
    });

    // Fetch users with filters and pagination
    const users = await userOps.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { column: 'createdAt', ascending: false },
      select: ['id', 'email', 'name', 'role', 'status', 'institution', 'teacherCode', 'createdAt'],
      limit,
      offset,
    });

    // Apply search filter in-memory (searches name and email)
    const filtered = search
      ? users.filter((u) => {
          const name = (u.name as string || '').toLowerCase();
          const email = (u.email as string || '').toLowerCase();
          const q = search.toLowerCase();
          return name.includes(q) || email.includes(q);
        })
      : users;

    const mappedUsers = filtered.map((u) => ({
      id: u.id as string,
      email: u.email as string,
      name: u.name as string,
      role: u.role as string,
      status: u.status as string,
      institution: u.institution as string || null,
      teacherCode: u.teacherCode as string || null,
      createdAt: u.createdAt as string,
    }));

    // Calculate pagination (total is approximate when search is applied)
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      users: mappedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Admin users error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
