import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAdminSession, unauthorizedResponse } from '@/lib/session';

export async function GET(req: NextRequest) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  try {
    const now = new Date();
    const sessions = await prisma.user_sessions.findMany({
      where: {
        is_revoked: false,
        expires_at: { gt: now },
      },
      include: {
        users: true,
      },
      orderBy: { last_activity_at: 'desc' },
      take: 50,
    });

    const data = sessions.map((s) => ({
      id: s.id,
      userId: s.user_id,
      userEmail: s.users.email,
      userName: `${s.users.first_name} ${s.users.last_name}`,
      deviceInfo: s.device_info,
      ipAddress: s.ip_address,
      createdAt: s.created_at,
      lastActivityAt: s.last_activity_at,
      expiresAt: s.expires_at,
      isCurrent: s.id === user.sessionId,
    }));

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
