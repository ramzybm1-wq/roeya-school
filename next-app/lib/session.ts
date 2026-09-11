/**
 * Session validation helper for API routes.
 * Validates the admin and client session tokens from the Authorization header or cookie.
 *
 * Performance: last_activity_at updates are throttled to at most once per 2 minutes
 * to eliminate redundant DB writes on rapid sequential requests.
 */

import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { hashToken, IDLE_TIMEOUT_MS } from '@/lib/auth';

// Throttle session activity updates — only write if >2 min since last recorded activity
const ACTIVITY_THROTTLE_MS = 2 * 60 * 1000;

export interface SessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: string[];
  allowedSchoolIds: string[];
  sessionId: string;
}

export interface ClientSessionUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  sessionId: string;
}

export async function validateAdminSession(req: NextRequest): Promise<SessionUser | null> {
  let rawToken: string | null = null;

  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    rawToken = authHeader.substring(7).trim();
  }

  if (!rawToken) {
    rawToken = req.cookies.get('vs_admin_session')?.value || null;
  }

  if (!rawToken || rawToken === 'null' || rawToken === 'undefined') {
    return null;
  }

  const tokenHash = hashToken(rawToken);
  const now = new Date();

  const session = await prisma.user_sessions.findFirst({
    where: {
      token_hash: tokenHash,
      is_revoked: false,
      expires_at: { gt: now },
    },
  });

  if (!session) return null;

  const idleLimit = new Date(session.last_activity_at.getTime() + IDLE_TIMEOUT_MS);
  if (idleLimit < now) {
    await prisma.user_sessions.update({
      where: { id: session.id },
      data: { is_revoked: true, revoked_at: now },
    });
    return null;
  }

  const user = await prisma.users.findUnique({
    where: { id: session.user_id },
  });

  if (!user || user.status !== 'ACTIVE') {
    await prisma.user_sessions.update({
      where: { id: session.id },
      data: { is_revoked: true, revoked_at: now },
    });
    return null;
  }

  // Throttle: only update last_activity_at if >2 minutes since last recorded activity
  const timeSinceLastActivity = now.getTime() - session.last_activity_at.getTime();
  if (timeSinceLastActivity > ACTIVITY_THROTTLE_MS) {
    // Fire-and-forget — no await needed since session is already validated
    prisma.user_sessions.update({
      where: { id: session.id },
      data: { last_activity_at: now },
    }).catch(() => { /* Swallow non-critical activity update failures */ });
  }

  const userRoleRows = await prisma.user_roles.findMany({
    where: { user_id: user.id },
    include: { roles: true },
  });
  const role = userRoleRows[0]?.roles?.code || 'AGENT';

  const permissionRows = await prisma.role_permissions.findMany({
    where: { role_id: { in: userRoleRows.map((ur) => ur.role_id) } },
    include: { permissions: true },
  });
  const permissions = permissionRows.map((rp) => rp.permissions.code);

  const schoolAccessRows = await prisma.user_school_access.findMany({
    where: { user_id: user.id },
  });
  const allowedSchoolIds = schoolAccessRows.map((r) => r.school_id);

  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    role,
    permissions,
    allowedSchoolIds,
    sessionId: session.id,
  };
}

export async function validateClientSession(req: NextRequest): Promise<ClientSessionUser | null> {
  let rawToken: string | null = null;

  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    rawToken = authHeader.substring(7).trim();
  }

  if (!rawToken) {
    rawToken = req.cookies.get('vs_client_session')?.value || null;
  }

  if (!rawToken || rawToken === 'null' || rawToken === 'undefined') {
    return null;
  }

  const tokenHash = hashToken(rawToken);
  const now = new Date();

  const session = await prisma.user_sessions.findFirst({
    where: {
      token_hash: tokenHash,
      is_revoked: false,
      expires_at: { gt: now },
    },
  });

  if (!session) return null;

  const user = await prisma.users.findUnique({
    where: { id: session.user_id },
  });

  if (!user || user.status !== 'ACTIVE') {
    return null;
  }

  // Throttle: only update last_activity_at if >2 minutes since last recorded activity
  const timeSinceLastActivity = now.getTime() - session.last_activity_at.getTime();
  if (timeSinceLastActivity > ACTIVITY_THROTTLE_MS) {
    prisma.user_sessions.update({
      where: { id: session.id },
      data: { last_activity_at: now },
    }).catch(() => { /* Swallow non-critical activity update failures */ });
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    phone: user.phone,
    sessionId: session.id,
  };
}

export function unauthorizedResponse(message = 'Session invalide ou expirée.') {
  return Response.json(
    { success: false, error: { code: 'UNAUTHORIZED', message } },
    { status: 401 }
  );
}
