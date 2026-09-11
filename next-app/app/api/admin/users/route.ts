import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAdminSession, unauthorizedResponse } from '@/lib/session';
import { hashPassword } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.toLowerCase() || '';
    const roleFilter = searchParams.get('role');
    const statusFilter = searchParams.get('status');

    // Fetch staff users (users having an assigned role)
    const staffUserRoles = await prisma.user_roles.findMany({
      include: {
        users: true,
        roles: true,
      },
    });

    // Map by user
    const usersMap = new Map<string, any>();
    for (const ur of staffUserRoles) {
      if (!ur.users) continue;
      const u = ur.users;
      if (usersMap.has(u.id)) {
        continue;
      }

      usersMap.set(u.id, {
        id: u.id,
        email: u.email,
        firstName: u.first_name,
        lastName: u.last_name,
        phone: u.phone,
        status: u.status,
        role: ur.roles.code,
        roleName: ur.roles.name,
        isTwoFactorEnabled: u.is_two_factor_enabled,
        lastLoginAt: u.last_login_at,
        createdAt: u.created_at,
        allowedSchoolIds: [],
      });
    }

    const schoolAccess = await prisma.user_school_access.findMany();
    for (const sa of schoolAccess) {
      const u = usersMap.get(sa.user_id);
      if (u) {
        u.allowedSchoolIds.push(sa.school_id);
      }
    }

    let list = Array.from(usersMap.values());

    // Role-based scoping if not super admin
    if (user.role !== 'SUPER_ADMIN') {
      list = list.filter(
        (u) =>
          u.role !== 'SUPER_ADMIN' &&
          u.allowedSchoolIds.some((sId: string) => user.allowedSchoolIds.includes(sId))
      );
    }

    // Apply filters
    if (search) {
      list = list.filter(
        (u) =>
          u.email.toLowerCase().includes(search) ||
          u.firstName.toLowerCase().includes(search) ||
          u.lastName.toLowerCase().includes(search)
      );
    }
    if (roleFilter) {
      list = list.filter((u) => u.role === roleFilter);
    }
    if (statusFilter) {
      list = list.filter((u) => u.status === statusFilter);
    }

    return NextResponse.json({ success: true, data: list });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  // Only SUPER_ADMIN and ADMIN can invite/create users
  if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Permissions insuffisantes.' } },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { email, firstName, lastName, phone, roleCode = 'AGENT', schoolIds = [], password } = body;

    if (!email || !firstName || !lastName) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Email, prénom et nom requis.' } },
        { status: 400 }
      );
    }

    const existing = await prisma.users.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: 'CONFLICT', message: 'Un utilisateur avec cet email existe déjà.' } },
        { status: 409 }
      );
    }

    const role = await prisma.roles.findUnique({ where: { code: roleCode } });
    if (!role) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Rôle introuvable.' } },
        { status: 404 }
      );
    }

    const pw = password || 'Password123!';
    const passwordHash = await hashPassword(pw);

    const newUser = await prisma.users.create({
      data: {
        email: email.toLowerCase(),
        first_name: firstName,
        last_name: lastName,
        phone: phone || null,
        password_hash: passwordHash,
        status: 'ACTIVE',
      },
    });

    await prisma.user_roles.create({
      data: {
        user_id: newUser.id,
        role_id: role.id,
      },
    });

    if (Array.isArray(schoolIds) && schoolIds.length > 0) {
      await prisma.user_school_access.createMany({
        data: schoolIds.map((sId: string) => ({
          user_id: newUser.id,
          school_id: sId,
        })),
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.first_name,
        lastName: newUser.last_name,
        phone: newUser.phone,
        role: role.code,
        status: newUser.status,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
