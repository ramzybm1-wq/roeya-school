import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword, generateSecureToken, hashToken, ABSOLUTE_TIMEOUT_MS } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();
    const password = (body.password || '').trim();
    const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Email et mot de passe requis.' } },
        { status: 400 }
      );
    }

    const user = await prisma.users.findUnique({ where: { email } });
    if (!user || user.status !== 'ACTIVE' || !user.password_hash) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Identifiants invalides ou compte inactif.' } },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Identifiants invalides.' } },
        { status: 401 }
      );
    }

    const rawToken = generateSecureToken(32);
    const tokenHash = hashToken(rawToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ABSOLUTE_TIMEOUT_MS);

    await prisma.user_sessions.create({
      data: {
        user_id: user.id,
        token_hash: tokenHash,
        device_info: userAgent ? userAgent.substring(0, 100) : 'Appareil inconnu',
        ip_address: ipAddress,
        user_agent: userAgent,
        is_revoked: false,
        expires_at: expiresAt,
        last_activity_at: now,
      },
    });

    const response = NextResponse.json({
      success: true,
      data: {
        token: rawToken,
        expiresAt,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
        },
      },
    });

    response.cookies.set('vs_client_session', rawToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60,
    });

    return response;
  } catch (err: any) {
    console.error('[API] POST /api/public/client/login error:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
