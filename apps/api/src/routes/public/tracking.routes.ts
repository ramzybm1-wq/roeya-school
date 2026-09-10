/**
 * Public Registration Tracking Routes (/api/public/tracking/*)
 * Handles secure code + phone verification, dossier status lookup,
 * client document replacement, and lost dossier recovery.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { RegistrationTrackingService } from '../../services/tracking.service';
import { ApiResponse } from '@vision-school/shared';

const router = Router();

// POST /api/public/tracking/verify - Verifies registration code + parent phone
router.post('/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { registrationCode, parentPhone } = req.body;
    if (!registrationCode || !parentPhone) {
      return res
        .status(400)
        .json(ApiResponse.error('Le numéro de dossier et le numéro de téléphone sont requis.', 'VALIDATION_ERROR'));
    }

    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const result = await RegistrationTrackingService.verifyTrackingAccess(registrationCode, parentPhone, clientIp);

    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

// GET /api/public/tracking/dossier - Fetches verified public dossier data
router.get('/dossier', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const trackingToken =
      (authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null) ||
      (req.query.token as string);

    if (!trackingToken) {
      return res.status(401).json(ApiResponse.error('Session de suivi requise.', 'UNAUTHORIZED'));
    }

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    const dossier = await RegistrationTrackingService.getVerifiedDossier(trackingToken);
    res.json(ApiResponse.success(dossier));
  } catch (error) {
    next(error);
  }
});

// POST /api/public/tracking/documents/:documentTypeId/replace - Replaces document inside verified session
router.post('/documents/:documentTypeId/replace', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const trackingToken =
      (authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null) ||
      (req.body.trackingToken as string);

    if (!trackingToken) {
      return res.status(401).json(ApiResponse.error('Session de suivi requise.', 'UNAUTHORIZED'));
    }

    const { documentTypeId } = req.params;
    const { fileBufferBase64, originalFilename, mimeType, sizeBytes } = req.body;

    if (!fileBufferBase64 || !originalFilename || !mimeType) {
      return res.status(400).json(ApiResponse.error('Fichier manquant ou invalide.', 'VALIDATION_ERROR'));
    }

    const buffer = Buffer.from(fileBufferBase64, 'base64');
    const result = await RegistrationTrackingService.replaceDocumentInTrackingSession(
      trackingToken,
      documentTypeId,
      {
        buffer,
        originalFilename,
        mimeType,
        sizeBytes: sizeBytes || buffer.length,
      }
    );

    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

// POST /api/public/tracking/lost-dossier - Safe lost dossier recovery request
router.post('/lost-dossier', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { identifier } = req.body;
    if (!identifier) {
      return res.status(400).json(ApiResponse.error('Numéro de téléphone ou email requis.', 'VALIDATION_ERROR'));
    }

    const result = await RegistrationTrackingService.requestLostDossierRecovery(identifier);
    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

export const PublicTrackingRouter = router;
export default router;
