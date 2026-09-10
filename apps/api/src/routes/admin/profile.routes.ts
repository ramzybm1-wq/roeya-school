/**
 * Admin Self-Service Profile Routes (/api/admin/profile/*)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../middleware/rbac.middleware';
import { AdminAuthService } from '../../services/admin-auth.service';
import { AdminSessionService } from '../../services/admin-session.service';
import { AdminTwoFactorService } from '../../services/admin-two-factor.service';
import { getDb, users } from '@vision-school/database';
import { eq } from 'drizzle-orm';
import { ApiResponse, AppError } from '@vision-school/shared';

const router = Router();
router.use(requireAuth());

// GET /api/admin/profile
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, req.user!.id));
    if (!user) throw AppError.notFound('Utilisateur');

    res.json(
      ApiResponse.success({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: req.user!.role,
        permissions: req.user!.permissions,
        allowedSchoolIds: req.user!.allowedSchoolIds,
        isTwoFactorEnabled: user.isTwoFactorEnabled,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      })
    );
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/profile
router.put('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { firstName, lastName, phone } = req.body;
    const db = getDb();

    await db
      .update(users)
      .set({
        firstName: firstName !== undefined ? firstName.trim() : undefined,
        lastName: lastName !== undefined ? lastName.trim() : undefined,
        phone: phone !== undefined ? phone : undefined,
        updatedAt: new Date(),
      })
      .where(eq(users.id, req.user!.id));

    res.json(ApiResponse.success({ message: 'Profil mis à jour avec succès.' }));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/profile/change-password
router.post('/change-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await AdminAuthService.changePassword(req.user!.id, currentPassword, newPassword, req.sessionId);
    res.json(ApiResponse.success({ message: 'Mot de passe modifié avec succès.' }));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/profile/2fa/setup
router.post('/2fa/setup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const setupData = await AdminTwoFactorService.initiateSetup(req.user!.id);
    res.json(ApiResponse.success(setupData));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/profile/2fa/confirm
router.post('/2fa/confirm', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { secret, verificationCode } = req.body;
    const result = await AdminTwoFactorService.confirmSetup(req.user!.id, secret, verificationCode);
    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/profile/2fa/disable
router.post('/2fa/disable', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await AdminTwoFactorService.disable(req.user!.id);
    res.json(ApiResponse.success({ message: '2FA désactivé avec succès.' }));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/profile/2fa/recovery-codes
router.post('/2fa/recovery-codes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const codes = await AdminTwoFactorService.regenerateRecoveryCodes(req.user!.id);
    res.json(ApiResponse.success({ recoveryCodes: codes }));
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/profile/sessions
router.get('/sessions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessions = await AdminSessionService.listUserSessions(req.user!.id, req.sessionId);
    res.json(ApiResponse.success(sessions));
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/profile/sessions/:id
router.delete('/sessions/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    await AdminSessionService.revokeSession(req.params.id);
    res.json(ApiResponse.success({ message: 'Session révoquée avec succès.' }));
  } catch (error) {
    next(error);
  }
});

export default router;
