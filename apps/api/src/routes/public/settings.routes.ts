/**
 * Public Settings Route (/api/public/settings)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { SettingsService } from '../../services/settings.service';
import { ApiResponse } from '@vision-school/shared';

const router = Router();
const settingsService = new SettingsService();

// GET /api/public/settings & GET /api/public/branding
const getPublicSettingsHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await settingsService.getPublicSettings();
    res.json(ApiResponse.success(settings));
  } catch (error) {
    next(error);
  }
};

router.get('/', getPublicSettingsHandler);
router.get('/branding', getPublicSettingsHandler);

export const PublicSettingsRouter = router;
export default router;
