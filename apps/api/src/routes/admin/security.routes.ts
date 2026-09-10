/**
 * Admin Security & Audit Routes (/api/admin/security/*)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requirePermission } from '../../middleware/rbac.middleware';
import { AdminSessionService } from '../../services/admin-session.service';
import { BackupService } from '../../services/backup.service';
import { getDb, auditLogs, loginEvents, users, userSessions } from '@vision-school/database';
import { eq, desc, gt, and } from 'drizzle-orm';
import { ApiResponse } from '@vision-school/shared';

const router = Router();
router.use(requireAuth());

// GET /api/admin/security/overview - Security posture score, checklist, and backup health
router.get('/overview', requirePermission('security.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const now = new Date();

    const activeSessions = await db
      .select()
      .from(userSessions)
      .where(and(eq(userSessions.isRevoked, false), gt(userSessions.expiresAt, now)));

    const lockedUsers = await db
      .select()
      .from(users)
      .where(gt(users.lockedUntil, now));

    const totalUsers = await db.select().from(users);
    const twoFactorUsers = totalUsers.filter((u) => u.isTwoFactorEnabled);
    const twoFactorAdoptionPercent =
      totalUsers.length > 0 ? Math.round((twoFactorUsers.length / totalUsers.length) * 100) : 100;

    const checklist = BackupService.getSecurityPostureChecklist();
    const backupHealth = BackupService.getBackupStatus();

    res.json(
      ApiResponse.success({
        securityScore: checklist.score,
        totalChecks: checklist.totalChecks,
        passedChecks: checklist.passedChecks,
        checklist: checklist.items,
        activeSessionsCount: activeSessions.length,
        lockedAccountsCount: lockedUsers.length,
        twoFactorAdoption: {
          enabledCount: twoFactorUsers.length,
          totalCount: totalUsers.length,
          percentage: twoFactorAdoptionPercent,
        },
        backupHealth,
      })
    );
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/security/events
router.get('/events', requirePermission('security.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const limit = parseInt((req.query.limit as string) || '50', 10);

    const logs = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);

    const logins = await db
      .select()
      .from(loginEvents)
      .orderBy(desc(loginEvents.createdAt))
      .limit(limit);

    res.json(
      ApiResponse.success({
        auditLogs: logs,
        loginEvents: logins,
      })
    );
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/security/sessions
router.get('/sessions', requirePermission('security.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const now = new Date();

    const activeSessions = await db
      .select({
        id: userSessions.id,
        userId: userSessions.userId,
        userEmail: users.email,
        userName: users.firstName,
        deviceInfo: userSessions.deviceInfo,
        ipAddress: userSessions.ipAddress,
        createdAt: userSessions.createdAt,
        lastActivityAt: userSessions.lastActivityAt,
        expiresAt: userSessions.expiresAt,
      })
      .from(userSessions)
      .innerJoin(users, eq(userSessions.userId, users.id))
      .where(and(eq(userSessions.isRevoked, false), gt(userSessions.expiresAt, now)))
      .orderBy(desc(userSessions.lastActivityAt));

    res.json(ApiResponse.success(activeSessions));
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/security/sessions/:id
router.delete('/sessions/:id', requirePermission('security.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await AdminSessionService.revokeSession(req.params.id);
    res.json(ApiResponse.success({ message: 'Session révoquée avec succès.' }));
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/security/locked-accounts
router.get('/locked-accounts', requirePermission('security.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const now = new Date();

    const lockedUsers = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        failedLoginAttempts: users.failedLoginAttempts,
        lockedUntil: users.lockedUntil,
        lastFailedLoginAt: users.lastFailedLoginAt,
      })
      .from(users)
      .where(gt(users.lockedUntil, now));

    res.json(ApiResponse.success(lockedUsers));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/security/cleanup - Expired exports & orphan upload retention cleanup
router.post('/cleanup', requirePermission('security.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await BackupService.cleanupExpiredExportsAndOrphans(req.user!);
    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

export const AdminSecurityRouter = router;
export default router;
