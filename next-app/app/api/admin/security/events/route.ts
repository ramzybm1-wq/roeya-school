import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAdminSession, unauthorizedResponse } from '@/lib/session';

export async function GET(req: NextRequest) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  try {
    const [auditLogs, loginEvents] = await Promise.all([
      prisma.audit_logs.findMany({
        take: 50,
        orderBy: { created_at: 'desc' },
        include: { users: true },
      }),
      prisma.login_events.findMany({
        take: 50,
        orderBy: { created_at: 'desc' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        auditLogs: auditLogs.map((l) => ({
          id: l.id,
          action: l.action,
          module: l.module,
          entityType: l.entity_type,
          userEmail: l.users?.email,
          result: l.result,
          ipAddress: l.ip_address,
          createdAt: l.created_at,
        })),
        loginEvents: loginEvents.map((e) => ({
          id: e.id,
          email: e.email_attempted || '—',
          eventType: e.event_type,
          result: e.result,
          ipAddress: e.ip_address,
          createdAt: e.created_at,
        })),
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
