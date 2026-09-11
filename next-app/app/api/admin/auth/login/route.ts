/**
 * Admin Authentication API — Login, 2FA, Forgot/Reset Password
 * Ported from apps/api/src/services/admin-auth.service.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  verifyPassword,
  generateSecureToken,
  hashToken,
  IDLE_TIMEOUT_MS,
  ABSOLUTE_TIMEOUT_MS,
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_DURATION_MS,
} from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';
    const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Email et mot de passe requis.' } },
        { status: 400 }
      );
    }

    // 1. Find user
    const user = await prisma.users.findFirst({
      where: { email },
    });

    const genericError = { success: false, error: { code: 'UNAUTHORIZED', message: 'Adresse email ou mot de passe incorrect.' } };

    if (!user) {
      await prisma.login_events.create({
        data: {
          email_attempted: email,
          event_type: 'LOGIN_FAILURE',
          result: 'FAILURE',
          ip_address: ipAddress,
          user_agent: userAgent,
        },
      });
      return NextResponse.json(genericError, { status: 401 });
    }

    const now = new Date();

    // 2. Check lockout
    if (user.locked_until && user.locked_until > now) {
      const minutesRemaining = Math.ceil((user.locked_until.getTime() - now.getTime()) / 60000);
      return NextResponse.json(
        { success: false, error: { code: 'RATE_LIMITED', message: `Compte temporairement verrouillé. Réessayez dans ${minutesRemaining} minute(s).` } },
        { status: 423 }
      );
    }

    // 3. Check account status
    if (user.status === 'INVITED') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: "Ce compte est en attente d'activation." } },
        { status: 403 }
      );
    }
    if (user.status === 'SUSPENDED' || user.status === 'DISABLED') {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Ce compte a été désactivé.' } },
        { status: 403 }
      );
    }

    // 4. Verify password
    if (!user.password_hash) {
      return NextResponse.json(genericError, { status: 401 });
    }

    const isPasswordValid = await verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      const updatedFailedAttempts = user.failed_login_attempts + 1;
      const shouldLock = updatedFailedAttempts >= MAX_FAILED_ATTEMPTS;
      const lockedUntil = shouldLock ? new Date(now.getTime() + LOCKOUT_DURATION_MS) : null;

      await prisma.users.update({
        where: { id: user.id },
        data: {
          failed_login_attempts: updatedFailedAttempts,
          last_failed_login_at: now,
          locked_until: lockedUntil,
          updated_at: now,
        },
      });

      await prisma.login_events.create({
        data: {
          user_id: user.id,
          email_attempted: email,
          event_type: shouldLock ? 'ACCOUNT_LOCKED' : 'LOGIN_FAILURE',
          result: 'FAILURE',
          ip_address: ipAddress,
          user_agent: userAgent,
        },
      });

      if (shouldLock) {
        return NextResponse.json(
          { success: false, error: { code: 'RATE_LIMITED', message: 'Compte verrouillé (15 minutes) suite à 5 tentatives.' } },
          { status: 423 }
        );
      }

      return NextResponse.json(genericError, { status: 401 });
    }

    // 5. Resolve user roles
    const userRoleRows = await prisma.user_roles.findMany({
      where: { user_id: user.id },
      include: { roles: true },
    });
    const primaryRole = userRoleRows[0]?.roles?.code || 'AGENT';

    // 6. Check 2FA
    const is2FaMandatory = primaryRole === 'SUPER_ADMIN';
    const requires2Fa = (is2FaMandatory || user.is_two_factor_enabled) && user.two_factor_secret;

    if (requires2Fa) {
      // Create 2FA challenge
      const challengeToken = generateSecureToken(24);
      const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes

      await prisma.two_factor_challenges.create({
        data: {
          user_id: user.id,
          challenge_token: challengeToken,
          expires_at: expiresAt,
          ip_address: ipAddress,
          user_agent: userAgent,
        },
      });

      return NextResponse.json({
        success: true,
        data: { requires2Fa: true, challengeToken },
      });
    }

    // 7. Successful login — create session
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

    // Reset lockout counters
    await prisma.users.update({
      where: { id: user.id },
      data: {
        failed_login_attempts: 0,
        locked_until: null,
        last_login_at: now,
        updated_at: now,
      },
    });

    // Record login event
    await prisma.login_events.create({
      data: {
        user_id: user.id,
        email_attempted: email,
        event_type: 'LOGIN_SUCCESS',
        result: 'SUCCESS',
        ip_address: ipAddress,
        user_agent: userAgent,
      },
    });

    // Fetch permissions
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
        requires2Fa: false,
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
    console.error('[API] POST /api/admin/auth/login error:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
