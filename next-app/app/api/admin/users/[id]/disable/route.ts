import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAdminSession, unauthorizedResponse } from '@/lib/session';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  const { id } = await params;

  try {
    await prisma.users.update({
      where: { id },
      data: { status: 'SUSPENDED' },
    });

    await prisma.user_sessions.updateMany({
      where: { user_id: id },
      data: { is_revoked: true, revoked_at: new Date() },
    });

    return NextResponse.json({ success: true, message: 'Compte désactivé.' });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
