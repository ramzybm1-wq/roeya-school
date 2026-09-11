import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
    const cookieToken = req.cookies.get('vs_admin_session')?.value;
    const token = bearerToken || cookieToken;

    if (token) {
      const tokenHash = hashToken(token);
      await prisma.user_sessions.updateMany({
        where: { token_hash: tokenHash },
        data: { is_revoked: true, revoked_at: new Date() },
      });
    }

    const res = NextResponse.json({
      success: true,
      data: { message: 'Déconnexion réussie.' },
    });

    res.cookies.delete('vs_admin_session');
    return res;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'LOGOUT_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
