/**
 * Admin Document Management Routes (/api/admin/documents/*)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requirePermission } from '../../middleware/rbac.middleware';
import { DocumentService } from '../../services/document.service';
import { ApiResponse } from '@vision-school/shared';

const router = Router();
router.use(requireAuth());

// ── Document Types Endpoints ──
// GET /api/admin/documents/types
router.get('/types', requirePermission('document.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await DocumentService.getAllDocumentTypes(req.user);
    res.json(ApiResponse.success(list));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/documents/types
router.post('/types', requirePermission('document.validate'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const created = await DocumentService.createDocumentType(req.user!, req.body);
    res.json(ApiResponse.success(created));
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/documents/types/:id
router.put('/types/:id', requirePermission('document.validate'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await DocumentService.updateDocumentType(req.user!, req.params.id, req.body);
    res.json(ApiResponse.success(updated));
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/documents/types/:id
router.delete('/types/:id', requirePermission('document.validate'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await DocumentService.deleteDocumentType(req.user!, req.params.id);
    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

// ── Document Requirements Endpoints ──
// GET /api/admin/documents/requirements
router.get('/requirements', requirePermission('document.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.query.schoolId as string | undefined;
    const academicYearId = req.query.academicYearId as string | undefined;
    const levelId = req.query.levelId as string | undefined;

    const list = await DocumentService.getRequirementsAdmin(req.user!, { schoolId, academicYearId, levelId });
    res.json(ApiResponse.success(list));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/documents/requirements
router.post('/requirements', requirePermission('document.validate'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const created = await DocumentService.createDocumentRequirement(req.user!, req.body);
    res.json(ApiResponse.success(created));
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/documents/requirements/:id
router.put('/requirements/:id', requirePermission('document.validate'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await DocumentService.updateDocumentRequirement(req.user!, req.params.id, req.body);
    res.json(ApiResponse.success(updated));
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/documents/requirements/:id
router.delete('/requirements/:id', requirePermission('document.validate'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await DocumentService.deleteDocumentRequirement(req.user!, req.params.id);
    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/documents/review-queue - Get review queue
router.get('/review-queue', requirePermission('document.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.query.schoolId as string | undefined;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    const queue = await DocumentService.getDocumentReviewQueue(req.user!, { schoolId, status, search });
    res.json(ApiResponse.success(queue));
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/documents/completeness/:registrationId - Get registration dossier completeness
router.get('/completeness/:registrationId', requirePermission('document.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = await DocumentService.getRegistrationDocumentCompleteness(req.params.registrationId);
    res.json(ApiResponse.success(summary));
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/documents/:id - Get document detail with version history
router.get('/:id', requirePermission('document.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const detail = await DocumentService.getDocumentDetail(req.user!, req.params.id);
    res.json(ApiResponse.success(detail));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/documents/:id/preview-url - Generate temporary signed preview URL
router.post('/:id/preview-url', requirePermission('document.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await DocumentService.getSecurePreviewUrl(req.user!, req.params.id);
    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/documents/:id/download-url - Generate temporary signed download URL
router.post('/:id/download-url', requirePermission('document.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await DocumentService.getSecureDownloadUrl(req.user!, req.params.id);
    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/documents/:id/validate - Validate document
router.post('/:id/validate', requirePermission('document.validate'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await DocumentService.validateDocument(req.user!, req.params.id);
    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/documents/:id/reject - Reject document
router.post('/:id/reject', requirePermission('document.validate'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reasonCode, internalComment } = req.body;
    const result = await DocumentService.rejectDocument(req.user!, req.params.id, reasonCode, internalComment);
    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/documents/:id/request-replacement - Request replacement from parent
router.post('/:id/request-replacement', requirePermission('document.validate'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { publicMessage, internalComment } = req.body;
    const result = await DocumentService.requestReplacement(req.user!, req.params.id, publicMessage, internalComment);
    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/documents/:id/status - Update document status
router.put('/:id/status', requirePermission('document.validate'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, reasonCode, publicMessage, internalComment } = req.body;
    let result: any;
    if (status === 'VALIDATED') {
      result = await DocumentService.validateDocument(req.user!, req.params.id);
    } else if (status === 'REJECTED') {
      result = await DocumentService.rejectDocument(req.user!, req.params.id, reasonCode, internalComment);
    } else if (status === 'REPLACEMENT_REQUIRED') {
      result = await DocumentService.requestReplacement(req.user!, req.params.id, publicMessage, internalComment);
    } else {
      return res.status(400).json(ApiResponse.error('Statut de document invalide.', 'VALIDATION_ERROR'));
    }
    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

export const AdminDocumentsRouter = router;
export default router;
