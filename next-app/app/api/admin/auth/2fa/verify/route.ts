import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  TotpSecurity,
  generateSecureToken,
  hashToken,
  ABSOLUTE_TIMEOUT_MS,
} from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { challengeToken, code } = body;
    const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    if (!challengeToken || !code) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Token de défi et code requis.' } },
        { status: 400 }
      );
    }

    const now = new Date();

    // 1. Find challenge
    const challenge = await prisma.two_factor_challenges.findUnique({
      where: { challenge_token: challengeToken },
      include: { users: true },
    });

    if (!challenge || challenge.expires_at < now) {
      return NextResponse.json(
        { success: false, error: { code: 'EXPIRED', message: 'Le défi 2FA a expiré ou est invalide.' } },
        { status: 400 }
      );
    }

    if (challenge.attempts >= challenge.max_attempts) {
      return NextResponse.json(
        { success: false, error: { code: 'RATE_LIMITED', message: 'Nombre maximum de tentatives dépassé.' } },
        { status: 429 }
      );
    }

    const user = challenge.users;
    if (!user || !user.two_factor_secret) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Configuration 2FA introuvable.' } },
        { status: 401 }
      );
    }

    // 2. Verify code
    const isValid = TotpSecurity.verify(code, user.two_factor_secret);

    if (!isValid) {
      await prisma.two_factor_challenges.update({
        where: { id: challenge.id },
        data: { attempts: challenge.attempts + 1 },
      });

      await prisma.login_events.create({
        data: {
          user_id: user.id,
          event_type: 'TWO_FACTOR_FAILED',
          result: 'FAILURE',
          ip_address: ipAddress,
          user_agent: userAgent,
        },
      });

      return NextResponse.json(
        { success: false, error: { code: 'INVALID_CODE', message: 'Code de vérification 2FA incorrect.' } },
        { status: 401 }
      );
    }

    // 3. Delete challenge
    await prisma.two_factor_challenges.delete({
      where: { id: challenge.id },
    });

    // 4. Issue session
    const rawToken = generateSecureToken(32);
    const tokenHash = hashToken(rawToken);
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

    await prisma.login_events.create({
      data: {
        user_id: user.id,
        event_type: 'TWO_FACTOR_VERIFIED',
        result: 'SUCCESS',
        ip_address: ipAddress,
        user_agent: userAgent,
      },
    });

    // 5. User roles and permissions
    const userRoleRows = await prisma.user_roles.findMany({
      where: { user_id: user.id },
      include: { roles: true },
    });
    const primaryRole = userRoleRows[0]?.roles?.code || 'AGENT';

    const schoolAccessRows = await prisma.user_school_access.findMany({
      where: { user_id: user.id },
    });
    const allowedSchoolIds = schoolAccessRows.map((r) => r.school_id);

    const permissionRows = await prisma.role_permissions.findMany({
      where: { role_id: { in: userRoleRows.map((ur) => ur.role_id) } },
      include: { permissions: true },
    });
    const permissions = permissionRows.map((rp) => rp.permissions.code);

    const response = NextResponse.json({
      success: true,
      data: {
        sessionToken: rawToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: primaryRole,
          permissions,
          allowedSchoolIds,
          isTwoFactorEnabled: user.is_two_factor_enabled,
        },
      },
    });

    response.cookies.set('vs_admin_session', rawToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 8 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (err: any) {
    console.error('[API] POST /api/admin/auth/2fa/verify error:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
