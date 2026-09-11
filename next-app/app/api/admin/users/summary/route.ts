import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAdminSession, unauthorizedResponse } from '@/lib/session';

export async function GET(req: NextRequest) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  try {
    const staffRows = await prisma.user_roles.findMany({
      include: {
        users: true,
        roles: true,
      },
    });

    const uniqueUsers = new Map<string, { status: string; roleCode: string }>();
    for (const ur of staffRows) {
      if (!ur.users) continue;
      if (!uniqueUsers.has(ur.user_id)) {
        uniqueUsers.set(ur.user_id, {
          status: ur.users.status,
          roleCode: ur.roles.code,
        });
      }
    }

    const all = Array.from(uniqueUsers.values());
    const total = all.length;
    const active = all.filter((u) => u.status === 'ACTIVE').length;
    const inactive = all.filter((u) => u.status !== 'ACTIVE').length;
    const superAdmins = all.filter((u) => u.roleCode === 'SUPER_ADMIN').length;
    const admins = all.filter((u) => u.roleCode === 'ADMIN').length;
    const agents = all.filter((u) => u.roleCode === 'AGENT').length;

    return NextResponse.json({
      success: true,
      data: {
        total,
        active,
        inactive,
        superAdmins,
        admins,
        agents,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
