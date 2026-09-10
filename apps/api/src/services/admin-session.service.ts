/**
 * Admin Session Management Service.
 * Manages secure sessions, idle/absolute timeouts, and server-side revocation.
 */

import { getDb } from '@vision-school/database';
import { userSessions, users } from '@vision-school/database';
import { eq, and, gt } from 'drizzle-orm';
import { TokenSecurity } from '@vision-school/auth';

const IDLE_TIMEOUT_MS = 60 * 60 * 1000; // 1 hour idle timeout
const ABSOLUTE_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 hours absolute timeout

export interface SessionInfo {
  id: string;
  userId: string;
  deviceInfo: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  isCurrent?: boolean;
}

export class AdminSessionService {
  /**
   * Creates a new authenticated session for a user.
   * Returns the raw session token (to be sent via HttpOnly cookie or header) and the session ID.
   */
  static async createSession(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
    deviceInfo?: string
  ): Promise<{ rawToken: string; sessionId: string; expiresAt: Date }> {
    const db = getDb();
    const rawToken = TokenSecurity.generateSecureToken(32);
    const tokenHash = TokenSecurity.hashToken(rawToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ABSOLUTE_TIMEOUT_MS);

    const [session] = await db
      .insert(userSessions)
      .values({
        userId,
        tokenHash,
        deviceInfo: deviceInfo || (userAgent ? userAgent.substring(0, 100) : 'Appareil inconnu'),
        ipAddress: ipAddress || '127.0.0.1',
        userAgent: userAgent || null,
        isRevoked: false,
        expiresAt,
        lastActivityAt: now,
      })
      .returning();

    return {
      rawToken,
      sessionId: session.id,
      expiresAt,
    };
  }

  /**
   * Validates a session token and updates the `lastActivityAt` timestamp.
   * Enforces both idle and absolute timeouts.
   */
  static async validateSession(rawToken: string): Promise<{ valid: boolean; userId?: string; sessionId?: string; reason?: string }> {
    if (!rawToken) {
      return { valid: false, reason: 'Token de session manquant.' };
    }

    const tokenHash = TokenSecurity.hashToken(rawToken);
    const db = getDb();

    const [session] = await db
      .select()
      .from(userSessions)
      .where(and(eq(userSessions.tokenHash, tokenHash), eq(userSessions.isRevoked, false)));

    if (!session) {
      return { valid: false, reason: 'Session invalide ou révoquée.' };
    }

    const now = new Date();

    // 1. Absolute timeout check
    if (session.expiresAt < now) {
      await this.revokeSession(session.id);
      return { valid: false, reason: 'Session expirée (délai absolu atteint).' };
    }

    // 2. Idle timeout check
    const idleLimit = new Date(session.lastActivityAt.getTime() + IDLE_TIMEOUT_MS);
    if (idleLimit < now) {
      await this.revokeSession(session.id);
      return { valid: false, reason: 'Session expirée en raison d’inactivité.' };
    }

    // 3. Check if user account is disabled or suspended
    const [user] = await db
      .select({ status: users.status })
      .from(users)
      .where(eq(users.id, session.userId));

    if (!user || user.status !== 'ACTIVE') {
      await this.revokeSession(session.id);
      return { valid: false, reason: `Compte utilisateur non actif (${user?.status || 'SUPPRIMÉ'}).` };
    }

    // Update last activity timestamp
    await db
      .update(userSessions)
      .set({ lastActivityAt: now })
      .where(eq(userSessions.id, session.id));

    return {
      valid: true,
      userId: session.userId,
      sessionId: session.id,
    };
  }

  /**
   * Lists all active (non-revoked, non-expired) sessions for a user.
   */
  static async listUserSessions(userId: string, currentSessionId?: string): Promise<SessionInfo[]> {
    const db = getDb();
    const now = new Date();

    const rows = await db
      .select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.userId, userId),
          eq(userSessions.isRevoked, false),
          gt(userSessions.expiresAt, now)
        )
      );

    return rows.map((s) => ({
      id: s.id,
      userId: s.userId,
      deviceInfo: s.deviceInfo,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      createdAt: s.createdAt,
      lastActivityAt: s.lastActivityAt,
      expiresAt: s.expiresAt,
      isCurrent: s.id === currentSessionId,
    }));
  }

  /**
   * Revokes a specific session by ID.
   */
  static async revokeSession(sessionId: string): Promise<void> {
    const db = getDb();
    await db
      .update(userSessions)
      .set({ isRevoked: true, revokedAt: new Date() })
      .where(eq(userSessions.id, sessionId));
  }

  /**
   * Revokes all active sessions for a user (e.g. on password reset or global logout).
   * Optionally keeps the specified current session.
   */
  static async revokeAllUserSessions(userId: string, exceptSessionId?: string): Promise<number> {
    const db = getDb();
    const rows = await db
      .select({ id: userSessions.id })
      .from(userSessions)
      .where(
        and(
          eq(userSessions.userId, userId),
          eq(userSessions.isRevoked, false)
        )
      );

    const toRevoke = exceptSessionId ? rows.filter((r) => r.id !== exceptSessionId) : rows;

    for (const s of toRevoke) {
      await this.revokeSession(s.id);
    }

    return toRevoke.length;
  }
}
