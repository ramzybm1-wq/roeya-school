/**
 * Public Document Routes (/api/public/documents/*)
 * Handles public requirement queries, client document replacement,
 * and secure signed binary streaming.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { DocumentService } from '../../services/document.service';
import { StorageService } from '../../services/storage.service';
import { ApiResponse } from '@vision-school/shared';

const router = Router();

import { getDb, schoolYearLevels } from '@vision-school/database';
import { eq, and } from 'drizzle-orm';

// GET /api/public/documents/requirements - Public requirements for a level
router.get('/requirements', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolYearLevelId = req.query.schoolYearLevelId as string | undefined;
    const schoolId = req.query.schoolId as string | undefined;
    const levelId = req.query.levelId as string | undefined;
    const cycleId = req.query.cycleId as string | undefined;
    const choiceId = req.query.choiceId as string | undefined;
    const academicYearId = req.query.academicYearId as string | undefined;

    if (schoolYearLevelId) {
      const requirements = await DocumentService.getPublicRequirementsForSchoolYearLevel(schoolYearLevelId);
      return res.json(ApiResponse.success(requirements));
    }

    const resolved = await DocumentService.resolveRequirements(
      schoolId || null,
      academicYearId || null,
      levelId || null,
      cycleId || null,
      choiceId || null
    );

    const publicReqs = resolved
      .filter((r) => r.isActive && r.showClient)
      .map((r) => ({
        documentTypeId: r.documentTypeId,
        nameFr: r.nameFr,
        nameAr: r.nameAr,
        descriptionFr: r.descriptionFr,
        descriptionAr: r.descriptionAr,
        fileRuleType: r.fileRuleType,
        maxFileSizeBytes: r.maxFileSizeBytes,
        maxFiles: r.maxFiles,
        isRequired: r.isRequired,
        blockSubmissionIfMissing: r.blockSubmissionIfMissing,
        displayOrder: r.displayOrder,
      }));

    res.json(ApiResponse.success(publicReqs));
  } catch (error) {
    next(error);
  }
});

// POST /api/public/documents/tracking/:token/replace/:documentTypeId - Parent replacement
router.post('/tracking/:token/replace/:documentTypeId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, documentTypeId } = req.params;
    const { fileBufferBase64, originalFilename, mimeType, sizeBytes } = req.body;

    if (!fileBufferBase64 || !originalFilename || !mimeType) {
      return res.status(400).json(ApiResponse.error('Fichier manquant ou invalide.', 'VALIDATION_ERROR'));
    }

    const buffer = Buffer.from(fileBufferBase64, 'base64');
    const result = await DocumentService.clientReplaceDocument(token, documentTypeId, {
      buffer,
      originalFilename,
      mimeType,
      sizeBytes: sizeBytes || buffer.length,
    });

    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

// GET /api/public/documents/secure-stream/:signedToken - Stream private file with HMAC validation
router.get('/secure-stream/:signedToken', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { signedToken } = req.params;
    const verification = StorageService.verifySignedToken(signedToken);

    if (!verification.valid || !verification.payload) {
      return res.status(403).json(ApiResponse.error(verification.error || 'Lien d’accès expiré ou invalide.', 'FORBIDDEN'));
    }

    const buffer = await StorageService.getPrivateBuffer(verification.payload.storageKey);
    if (!buffer) {
      return res.status(404).json(ApiResponse.error('Fichier introuvable.', 'NOT_FOUND'));
    }

    const mimeType = verification.payload.storageKey.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);

    if (verification.payload.action === 'download') {
      const filename = verification.payload.filename || 'document.pdf';
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    } else {
      res.setHeader('Content-Disposition', 'inline');
    }

    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

export const PublicDocumentsRouter = router;
export default router;
