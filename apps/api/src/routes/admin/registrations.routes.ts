/**
 * Admin Registrations Management Routes (/api/admin/registrations/*)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requirePermission, requireAnyPermission } from '../../middleware/rbac.middleware';
import { RegistrationService } from '../../services/registration.service';
import { ApiResponse, AppError } from '@vision-school/shared';

const router = Router();
const registrationService = new RegistrationService();

router.use(requireAuth());

// GET /api/admin/registrations (List with filters & search)
router.get('/', requirePermission('registration.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filter = {
      page: req.query.page ? Number(req.query.page) : 1,
      limit: req.query.limit ? Number(req.query.limit) : 20,
      schoolId: req.query.schoolId as string,
      levelId: req.query.levelId as string,
      academicYearId: req.query.academicYearId as string,
      status: req.query.status as any,
      search: req.query.search as string,
    };

    const result = await registrationService.getAdminRegistrations(filter, req.user);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/registrations/:id (Detail dossier)
router.get('/:id', requirePermission('registration.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reg = await registrationService.getRegistrationById(req.params.id, req.user);
    res.json(ApiResponse.success(reg));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/registrations (Create dossier from admin console)
router.post('/', requirePermission('registration.create'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body;
    if (!body || !body.schoolId || !body.levelId) {
      throw AppError.badRequest('Veuillez sélectionner un établissement et un niveau scolaire.');
    }

    const result = await registrationService.submitPublicRegistration({
      schoolId: body.schoolId,
      levelId: body.levelId,
      academicYearId: body.academicYearId,
      student: {
        firstNameFr: body.student?.firstNameFr || 'Élève',
        lastNameFr: body.student?.lastNameFr || 'Nom',
        gender: body.student?.gender || 'MALE',
        birthDate: body.student?.birthDate || '2018-01-01',
        birthPlace: body.student?.birthPlace,
        currentSchool: body.student?.currentSchool,
      },
      primaryParent: {
        firstNameFr: body.primaryParent?.firstNameFr || 'Parent',
        lastNameFr: body.primaryParent?.lastNameFr || 'Nom',
        phonePrimary: body.primaryParent?.phonePrimary || '0550000000',
        phoneSecondary: body.primaryParent?.phoneSecondary,
        email: body.primaryParent?.email,
        address: body.primaryParent?.address,
      },
    } as any);

    res.status(201).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

// Status Update handler (Accept, Refuse, Waitlist, Cancel, Review)
// Supports both PATCH and PUT to guarantee full frontend compatibility
const handleStatusUpdate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, adminNotes, refusalReason, publicComment, internalComment } = req.body;
    if (!status) {
      throw AppError.badRequest('Le statut est obligatoire.');
    }

    const updated = await registrationService.updateStatus(
      req.params.id,
      { status, adminNotes, refusalReason, publicComment, internalComment },
      req.user!
    );

    res.json(ApiResponse.success(updated));
  } catch (error) {
    next(error);
  }
};

router.patch('/:id/status', requireAnyPermission(['registration.update', 'registration.accept', 'registration.refuse']), handleStatusUpdate);
router.put('/:id/status', requireAnyPermission(['registration.update', 'registration.accept', 'registration.refuse']), handleStatusUpdate);

// Convenience action routes
router.post('/:id/accept', requireAnyPermission(['registration.update', 'registration.accept']), (req, res, next) => {
  req.body.status = 'ACCEPTED';
  return handleStatusUpdate(req, res, next);
});

router.post('/:id/refuse', requireAnyPermission(['registration.update', 'registration.refuse']), (req, res, next) => {
  req.body.status = 'REFUSED';
  return handleStatusUpdate(req, res, next);
});

router.post('/:id/review', requireAnyPermission(['registration.update']), (req, res, next) => {
  req.body.status = 'UNDER_REVIEW';
  return handleStatusUpdate(req, res, next);
});

// POST /api/admin/registrations/:id/notes (Add internal note)
router.post('/:id/notes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { content } = req.body;
    if (!content) {
      throw AppError.badRequest('Le contenu de la note est obligatoire.');
    }

    const note = await registrationService.addNote(req.params.id, content, req.user!);
    res.json(ApiResponse.success(note));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/registrations/:id/cancel-acceptance (Cancel accepted status & release capacity)
router.post('/:id/cancel-acceptance', requireAnyPermission(['registration.update', 'registration.accept']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { reason } = req.body;
    const result = await registrationService.cancelAcceptedRegistration(req.params.id, req.user!, reason);
    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/registrations/:id — Permanent deletion (supports ?forceCancel=true for accepted dossiers)
router.delete('/:id', requireAnyPermission(['registration.delete', 'registration.update']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const forceCancelAccepted = req.query.forceCancel === 'true' || req.query.force === 'true';
    const reason = (req.query.reason || req.body?.reason) as string | undefined;
    const result = await registrationService.deleteRegistration(req.params.id, req.user!, {
      forceCancelAccepted,
      reason,
    });
    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

export const AdminRegistrationsRouter = router;
export default router;

