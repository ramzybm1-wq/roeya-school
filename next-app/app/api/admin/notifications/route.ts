import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAdminSession, unauthorizedResponse } from '@/lib/session';

export async function GET(req: NextRequest) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  try {
    const list = await prisma.notifications.findMany({
      where: {
        OR: [
          { user_id: user.id },
          { user_id: null },
        ],
      },
      orderBy: { created_at: 'desc' },
      take: 50,
    });

    const unreadCount = list.filter((n) => !n.is_read).length;

    const data = list.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      targetEntityType: n.target_entity_type,
      targetEntityId: n.target_entity_id,
      isRead: n.is_read,
      createdAt: n.created_at,
    }));

    return NextResponse.json({ success: true, data, unreadCount });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  try {
    // Mark all as read
    await prisma.notifications.updateMany({
      where: {
        OR: [
          { user_id: user.id },
          { user_id: null },
        ],
        is_read: false,
      },
      data: { is_read: true },
    });

    return NextResponse.json({ success: true, message: 'Notifications marquées comme lues.' });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
