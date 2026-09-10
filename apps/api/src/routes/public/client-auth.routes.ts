/**
 * Public Client Authentication & Parent Portal Routes (/api/public/client/*)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { ClientAuthService } from '../../services/client-auth.service';
import { AdminSessionService } from '../../services/admin-session.service';
import { ApiResponse, AppError } from '@vision-school/shared';

const router = Router();

// Helper middleware to require authenticated client
function requireClientAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    throw AppError.unauthorized('Veuillez vous connecter pour accéder à votre espace.');
  }
  next();
}

// POST /api/public/client/register - Parent registration
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await ClientAuthService.register(
      { email, password, firstName, lastName, phone },
      ip,
      userAgent
    );

    res.cookie('vs_client_session', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60 * 1000,
    });

    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

// POST /api/public/client/login - Parent login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await ClientAuthService.login(
      { email, password },
      ip,
      userAgent
    );

    res.cookie('vs_client_session', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60 * 1000,
    });

    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

// GET /api/public/client/me - Current parent profile
router.get('/me', requireClientAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const me = await ClientAuthService.getMe(req.user!.id);
    res.json(ApiResponse.success(me));
  } catch (error) {
    next(error);
  }
});

// PUT /api/public/client/profile - Update parent profile
router.put('/profile', requireClientAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await ClientAuthService.updateProfile(req.user!.id, req.body);
    res.json(ApiResponse.success(updated));
  } catch (error) {
    next(error);
  }
});

// POST /api/public/client/change-password - Change parent password
router.post('/change-password', requireClientAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const result = await ClientAuthService.changePassword(req.user!.id, oldPassword, newPassword);
    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

// POST /api/public/client/forgot-password - Safe forgot password
router.post('/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const result = await ClientAuthService.forgotPassword(email);
    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

// POST /api/public/client/logout - Parent logout
router.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.sessionId) {
      await AdminSessionService.revokeSession(req.sessionId);
    }
    res.clearCookie('vs_client_session', { path: '/' });
    res.json(ApiResponse.success({ message: 'Déconnexion réussie.' }));
  } catch (error) {
    next(error);
  }
});

// GET /api/public/client/registrations - Parent's registrations list
router.get('/registrations', requireClientAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await ClientAuthService.getMyRegistrations(req.user!.id);
    res.json(ApiResponse.success(list));
  } catch (error) {
    next(error);
  }
});

// GET /api/public/client/registrations/:id - Single registration detail with IDOR prevention
router.get('/registrations/:id', requireClientAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const detail = await ClientAuthService.getMyRegistrationDetail(req.user!.id, req.params.id);
    res.json(ApiResponse.success(detail));
  } catch (error) {
    next(error);
  }
});

// POST /api/public/client/registrations/:id/documents/:documentTypeId - Upload replacement document
router.post(
  '/registrations/:id/documents/:documentTypeId',
  requireClientAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { bufferBase64, filename, mimeType } = req.body;
      if (!bufferBase64) {
        return res.status(400).json(ApiResponse.error('Fichier manquant.', 'VALIDATION_ERROR'));
      }

      const uploaded = await ClientAuthService.uploadReplacementDocument(
        req.user!.id,
        req.params.id,
        req.params.documentTypeId,
        { bufferBase64, filename, mimeType }
      );

      res.json(ApiResponse.success(uploaded));
    } catch (error) {
      next(error);
    }
  }
);

export const PublicClientAuthRouter = router;
export default router;
