/**
 * Admin Settings & Branding Routes (/api/admin/settings/*)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requirePermission, requireAnyPermission } from '../../middleware/rbac.middleware';
import { SettingsService } from '../../services/settings.service';
import { ApiResponse, AppError } from '@vision-school/shared';

const router = Router();
const settingsService = new SettingsService();

router.use(requireAuth());

// GET /api/admin/settings & GET /api/admin/settings/branding
const getSettingsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await settingsService.getPublicSettings();
    res.json(ApiResponse.success(settings));
  } catch (error) {
    next(error);
  }
};
router.get('/', requireAnyPermission(['settings.manage', 'settings.read', 'school.read', 'school.manage']), getSettingsHandler);
router.get('/branding', requireAnyPermission(['settings.manage', 'settings.read', 'school.read', 'school.manage']), getSettingsHandler);

// PUT /api/admin/settings/branding & PATCH /api/admin/settings/branding
const updateBrandingHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await settingsService.updateBrandingSettings(req.user!, req.body);
    res.json(ApiResponse.success(updated));
  } catch (error) {
    next(error);
  }
};
router.put('/branding', requireAnyPermission(['settings.manage', 'school.manage']), updateBrandingHandler);
router.patch('/branding', requireAnyPermission(['settings.manage', 'school.manage']), updateBrandingHandler);

// POST /api/admin/settings/logos
router.post('/logos', requireAnyPermission(['settings.manage', 'school.manage']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { target, fileBufferBase64, mimeType, originalFilename } = req.body;
    if (!target || !fileBufferBase64 || !mimeType) {
      throw AppError.badRequest('Cible (target) et image base64 requises.');
    }

    const buffer = Buffer.from(fileBufferBase64, 'base64');
    const result = await settingsService.uploadLogo(req.user!, target, {
      buffer,
      mimeType,
      originalFilename: originalFilename || `${target}_logo.png`,
    });

    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/settings/logos/:target
router.delete('/logos/:target', requireAnyPermission(['settings.manage', 'school.manage']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const target = req.params.target as 'client' | 'admin' | 'favicon';
    const updated = await settingsService.removeLogo(req.user!, target);
    res.json(ApiResponse.success(updated));
  } catch (error) {
    next(error);
  }
});

export const AdminSettingsRouter = router;
export default router;
