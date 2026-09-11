import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAdminSession, unauthorizedResponse } from '@/lib/session';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  const { id } = await params;

  try {
    const targetUser = await prisma.users.findUnique({
      where: { id },
      include: {
        user_roles: { include: { roles: true } },
        user_school_access: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Utilisateur non trouvé.' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: targetUser.id,
        email: targetUser.email,
        firstName: targetUser.first_name,
        lastName: targetUser.last_name,
        phone: targetUser.phone,
        status: targetUser.status,
        role: targetUser.user_roles[0]?.roles.code || 'AGENT',
        allowedSchoolIds: targetUser.user_school_access.map((s) => s.school_id),
        isTwoFactorEnabled: targetUser.is_two_factor_enabled,
        lastLoginAt: targetUser.last_login_at,
        createdAt: targetUser.created_at,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  if (user.role !== 'SUPER_ADMIN' && user.role !== 'ADMIN') {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Action non autorisée.' } },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { firstName, lastName, phone, roleCode, schoolIds, status } = body;

    const updated = await prisma.users.update({
      where: { id },
      data: {
        ...(firstName ? { first_name: firstName } : {}),
        ...(lastName ? { last_name: lastName } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(status ? { status } : {}),
      },
    });

    if (roleCode) {
      const role = await prisma.roles.findUnique({ where: { code: roleCode } });
      if (role) {
        await prisma.user_roles.deleteMany({ where: { user_id: id } });
        await prisma.user_roles.create({
          data: { user_id: id, role_id: role.id },
        });
      }
    }

    if (Array.isArray(schoolIds)) {
      await prisma.user_school_access.deleteMany({ where: { user_id: id } });
      if (schoolIds.length > 0) {
        await prisma.user_school_access.createMany({
          data: schoolIds.map((sId: string) => ({
            user_id: id,
            school_id: sId,
          })),
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        email: updated.email,
        firstName: updated.first_name,
        lastName: updated.last_name,
        status: updated.status,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  if (user.role !== 'SUPER_ADMIN') {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: 'Seul le Super Admin peut supprimer un utilisateur.' } },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    // Soft delete: set status to INACTIVE
    await prisma.users.update({
      where: { id },
      data: { status: 'DISABLED' },
    });

    // Revoke sessions
    await prisma.user_sessions.updateMany({
      where: { user_id: id },
      data: { is_revoked: true, revoked_at: new Date() },
    });

    return NextResponse.json({ success: true, message: 'Utilisateur désactivé avec succès.' });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
