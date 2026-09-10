/**
 * Admin Authentication Routes (/api/admin/auth/*)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { AdminAuthService } from '../../services/admin-auth.service';
import { AdminUserService } from '../../services/admin-user.service';
import { requireAuth } from '../../middleware/rbac.middleware';
import { ApiResponse } from '@vision-school/shared';

const router = Router();

// POST /api/admin/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown';

    const result = await AdminAuthService.login(email, password, ipAddress, userAgent);

    // If session was issued, optionally set secure HttpOnly cookie
    if (result.sessionToken) {
      res.cookie('vs_admin_session', result.sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 8 * 60 * 60 * 1000, // 8 hours
      });
    }

    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/auth/2fa/verify
router.post('/2fa/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { challengeToken, code } = req.body;
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown';

    const result = await AdminAuthService.verifyTwoFactor(challengeToken, code, ipAddress, userAgent);

    if (result.sessionToken) {
      res.cookie('vs_admin_session', result.sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 8 * 60 * 60 * 1000,
      });
    }

    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/auth/logout
router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.sessionId) {
      await AdminAuthService.logout(req.sessionId, req.user?.id);
    }
    res.clearCookie('vs_admin_session');
    res.json(ApiResponse.success({ message: 'Déconnexion réussie.' }));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const result = await AdminAuthService.requestPasswordReset(email, ipAddress);
    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/auth/reset-password
router.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, newPassword } = req.body;
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    await AdminAuthService.resetPassword(token, newPassword, ipAddress);
    res.json(ApiResponse.success({ message: 'Votre mot de passe a été réinitialisé avec succès.' }));
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/auth/invitation/:token
router.get('/invitation/:token', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await AdminUserService.validateInvitation(req.params.token);
    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/auth/invitation/accept
router.post('/invitation/accept', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, password } = req.body;
    const result = await AdminUserService.acceptInvitation(token, password);
    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/auth/me
router.get('/me', requireAuth(), (req: Request, res: Response) => {
  res.json(ApiResponse.success(req.user));
});

export default router;
