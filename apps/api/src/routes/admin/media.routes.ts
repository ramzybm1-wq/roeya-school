/**
 * Admin Media Management Routes (/api/admin/media/*)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requirePermission } from '../../middleware/rbac.middleware';
import { MediaService } from '../../services/media.service';
import { ApiResponse } from '@vision-school/shared';

const router = Router();
router.use(requireAuth());

// GET /api/admin/media - List media assets
router.get('/', requirePermission('media.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const type = req.query.type as string | undefined;
    const schoolId = req.query.schoolId as string | undefined;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    const list = await MediaService.getAdminMediaList(req.user!, { type, schoolId, status, search });
    res.json(ApiResponse.success(list));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/media - Upload new media asset
router.post('/', requirePermission('media.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      type,
      title,
      altTextFr,
      altTextAr,
      description,
      schoolId,
      galleryCategory,
      isFeatured,
      focalX,
      focalY,
      initialStatus,
      originalFile,
      desktopFile,
      tabletFile,
      mobileFile,
    } = req.body;

    if (!originalFile || !originalFile.bufferBase64) {
      return res.status(400).json(ApiResponse.error('Fichier image original manquant.', 'VALIDATION_ERROR'));
    }

    const originalBuffer = Buffer.from(originalFile.bufferBase64, 'base64');
    const result = await MediaService.uploadMedia(
      {
        type: type || 'OTHER',
        title,
        altTextFr,
        altTextAr,
        description,
        schoolId,
        galleryCategory,
        isFeatured,
        focalX,
        focalY,
        initialStatus,
      },
      {
        original: {
          buffer: originalBuffer,
          originalFilename: originalFile.filename || 'image.jpg',
          mimeType: originalFile.mimeType || 'image/jpeg',
          sizeBytes: originalBuffer.length,
          width: originalFile.width,
          height: originalFile.height,
        },
        desktop: desktopFile?.bufferBase64
          ? {
              buffer: Buffer.from(desktopFile.bufferBase64, 'base64'),
              originalFilename: desktopFile.filename || 'desktop.jpg',
              mimeType: desktopFile.mimeType || 'image/jpeg',
            }
          : undefined,
        tablet: tabletFile?.bufferBase64
          ? {
              buffer: Buffer.from(tabletFile.bufferBase64, 'base64'),
              originalFilename: tabletFile.filename || 'tablet.jpg',
              mimeType: tabletFile.mimeType || 'image/jpeg',
            }
          : undefined,
        mobile: mobileFile?.bufferBase64
          ? {
              buffer: Buffer.from(mobileFile.bufferBase64, 'base64'),
              originalFilename: mobileFile.filename || 'mobile.jpg',
              mimeType: mobileFile.mimeType || 'image/jpeg',
            }
          : undefined,
      },
      req.user!
    );

    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

// PATCH /api/admin/media/:id/focal-point - Update focal point
router.patch('/:id/focal-point', requirePermission('media.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { focalX, focalY } = req.body;
    if (focalX === undefined || focalY === undefined) {
      return res.status(400).json(ApiResponse.error('focalX et focalY sont requis (0.0 à 1.0).', 'VALIDATION_ERROR'));
    }

    const updated = await MediaService.updateFocalPoint(req.user!, req.params.id, Number(focalX), Number(focalY));
    res.json(ApiResponse.success(updated));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/media/:id/publish - Publish media
router.post('/:id/publish', requirePermission('media.publish'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await MediaService.publishMedia(req.user!, req.params.id);
    res.json(ApiResponse.success(updated));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/media/:id/unpublish - Unpublish media
router.post('/:id/unpublish', requirePermission('media.publish'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await MediaService.unpublishMedia(req.user!, req.params.id);
    res.json(ApiResponse.success(updated));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/media/:id/assign - Assign to placement / school
router.post('/:id/assign', requirePermission('media.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { placement, schoolId, displayOrder } = req.body;
    if (!placement) {
      return res.status(400).json(ApiResponse.error('placement est requis.', 'VALIDATION_ERROR'));
    }

    const assignment = await MediaService.assignPlacement(req.user!, req.params.id, placement, schoolId, displayOrder);
    res.json(ApiResponse.success(assignment));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/media/:id/archive - Archive media asset
router.post('/:id/archive', requirePermission('media.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await MediaService.archiveMedia(req.user!, req.params.id);
    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/media/:id/restore - Restore archived media asset
router.post('/:id/restore', requirePermission('media.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await MediaService.restoreMedia(req.user!, req.params.id);
    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/media/:id - Delete media asset
router.delete('/:id', requirePermission('media.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await MediaService.deleteMedia(req.user!, req.params.id);
    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

export const AdminMediaRouter = router;
export default router;
