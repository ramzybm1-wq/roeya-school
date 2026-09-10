/**
 * Public Media Routes (/api/public/media/*)
 * Serves public branding, logos, responsive placements, gallery assets, and image streams.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { MediaService } from '../../services/media.service';
import { StorageService } from '../../services/storage.service';
import { ApiResponse } from '@vision-school/shared';

const router = Router();

// GET /api/public/media/branding - Resolves public branding logos and backgrounds
router.get('/branding', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.query.schoolId as string | undefined;
    const branding = await MediaService.getPublicBranding(schoolId);
    res.json(ApiResponse.success(branding));
  } catch (error) {
    next(error);
  }
});

// GET /api/public/media/placement/:placement - Resolves responsive media for a specific placement
router.get('/placement/:placement', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { placement } = req.params;
    const schoolId = req.query.schoolId as string | undefined;
    const media = await MediaService.getPublicPlacementMedia(placement, schoolId);
    res.json(ApiResponse.success(media));
  } catch (error) {
    next(error);
  }
});

// GET /api/public/media/gallery - Public gallery listing
router.get('/gallery', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.query.schoolId as string | undefined;
    const category = req.query.category as string | undefined;
    const isFeatured = req.query.isFeatured !== undefined ? req.query.isFeatured === 'true' : undefined;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    const gallery = await MediaService.getPublicGallery({ schoolId, category, isFeatured, page, limit });
    res.json(ApiResponse.success(gallery));
  } catch (error) {
    next(error);
  }
});

// GET /api/public/media/stream/* - Stream public visual image asset
router.get('/stream/*', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const storageKey = req.params[0] || (req.params as any)['0'];
    if (!storageKey) {
      return res.status(400).json(ApiResponse.error('Chemin d’asset manquant.', 'VALIDATION_ERROR'));
    }

    const result = await StorageService.getPublicMediaBuffer(storageKey);
    if (!result) {
      return res.status(404).json(ApiResponse.error('Image introuvable.', 'NOT_FOUND'));
    }

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.send(result.buffer);
  } catch (error) {
    next(error);
  }
});

export const PublicMediaRouter = router;
export default router;
