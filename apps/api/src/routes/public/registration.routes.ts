/**
 * Public Registration Routes (/api/public/registration/*)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { RegistrationValidator } from '@vision-school/validation';
import { RegistrationService } from '../../services/registration.service';
import { FormBuilderService } from '../../services/form-builder.service';
import { DocumentService } from '../../services/document.service';
import { ApiResponse, AppError } from '@vision-school/shared';

const router = Router();
const registrationService = new RegistrationService();

// POST /api/public/registration
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body;
    if (!body) {
      throw AppError.badRequest('Données d’inscription manquantes.');
    }

    let schoolId = body.schoolId;
    let levelId = body.levelId;
    let academicYearId = body.academicYearId;

    // If schoolYearLevelId provided without explicit schoolId or levelId, resolve from DB
    if ((!schoolId || !levelId) && body.schoolYearLevelId) {
      const { getDb, schoolYearLevels } = await import('@vision-school/database');
      const { eq } = await import('drizzle-orm');
      const sylId = body.schoolYearLevelId;
      const db = getDb();
      const [syl] = await db.select().from(schoolYearLevels).where(eq(schoolYearLevels.id, sylId));
      if (syl) {
        schoolId = syl.schoolId;
        levelId = syl.levelId;
        academicYearId = academicYearId || syl.academicYearId;
      }
    }
    
    // Normalize or validate
    if (!schoolId || !levelId) {
      throw AppError.badRequest('Veuillez sélectionner un établissement et un niveau scolaire.');
    }

    const studentObj = body.student || {};
    const parentObj = body.primaryParent || body.parent || {};

    if (!req.user) {
      throw AppError.unauthorized('Un compte parent authentifié est obligatoire pour soumettre une demande d’inscription.');
    }
    const clientUserId = req.user.id;

    // Validate document requirements if Step 4 (Documents) is visible in the published form
    try {
      const publishedForm = await FormBuilderService.resolveActiveForm(
        schoolId,
        academicYearId,
        'PUBLISHED'
      );
      const docSec = publishedForm.sections.find((s) => s.key === 'step_documents');
      const isDocStepVisible = docSec ? docSec.isVisible : true;

      if (isDocStepVisible) {
        const activeReqs = await DocumentService.resolveRequirements(
          schoolId,
          academicYearId,
          levelId,
          undefined,
          body.choiceId
        );

        const requiredDocs = activeReqs.filter(
          (r) => r.isActive && r.showClient && (r.isRequired || r.blockSubmissionIfMissing)
        );
        const submittedDocs = Array.isArray(body.documents) ? body.documents : [];

        for (const req of requiredDocs) {
          const hasDoc = submittedDocs.some(
            (d: any) =>
              d &&
              (d.documentTypeId === req.documentTypeId ||
               d.documentTypeId === req.id ||
               (d.name && req.nameFr && d.name.toLowerCase().includes(req.nameFr.toLowerCase()))) &&
              (d.base64Data || d.storageKey || d.buffer || d.fileUrl)
          );

          if (!hasDoc) {
            throw AppError.badRequest(`Le document "${req.nameFr}" est obligatoire.`);
          }
        }
      }
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      // If error resolving form/requirements, proceed with submission
    }

    const result = await registrationService.submitPublicRegistration({
      schoolId,
      levelId,
      choiceId: body.choiceId,
      previousLevelId: body.previousLevelId,
      previousChoiceId: body.previousChoiceId,
      academicYearId,
      clientUserId,
      documents: body.documents || [],
      student: {
        firstNameFr: studentObj.firstName || studentObj.firstNameFr || body.studentFirstName || 'Élève',
        lastNameFr: studentObj.lastName || studentObj.lastNameFr || body.studentLastName || 'Nom',
        gender: studentObj.gender || body.gender || 'MALE',
        birthDate: studentObj.dateOfBirth || studentObj.birthDate || body.birthDate || '2018-01-01',
        birthPlace: studentObj.placeOfBirth || studentObj.birthPlace || body.birthPlace,
        currentSchool: studentObj.currentSchool || body.currentSchool,
        wilaya: studentObj.wilaya || body.wilaya || 'Alger',
        commune: studentObj.commune || body.commune,
      },
      primaryParent: {
        firstNameFr: parentObj.firstName || parentObj.firstNameFr || body.parentFirstName || 'Parent',
        lastNameFr: parentObj.lastName || parentObj.lastNameFr || body.parentLastName || 'Nom',
        phonePrimary: parentObj.phone || parentObj.phonePrimary || body.parentPhone || '0550000000',
        phoneSecondary: parentObj.phoneSecondary || body.parentPhoneSecondary,
        email: parentObj.email || body.parentEmail,
        address: parentObj.address || body.parentAddress,
        wilaya: parentObj.wilaya || body.parentWilaya || 'Alger',
        commune: parentObj.commune || body.parentCommune,
      },
    } as any);

    res.status(201).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

// GET /api/public/registration/track
router.get('/track', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const code = (req.query.code as string || '').trim();
    const phone = (req.query.phone as string || '').trim();

    if (!code) {
      throw AppError.badRequest('Le code de dossier est obligatoire.');
    }

    const reg = await registrationService.getRegistrationById(code);
    
    // Verification if phone provided
    if (phone && reg.parent?.phonePrimary) {
      const cleanInput = phone.replace(/\s+/g, '');
      const cleanDb = reg.parent.phonePrimary.replace(/\s+/g, '');
      if (!cleanDb.includes(cleanInput) && !cleanInput.includes(cleanDb)) {
        throw AppError.forbidden('Numéro de téléphone ne correspond pas au dossier.');
      }
    }

    res.json(ApiResponse.success({
      code: reg.code,
      status: reg.status,
      submittedAt: reg.submittedAt,
      studentFullName: reg.student?.fullName,
      schoolName: reg.school?.name,
      levelName: reg.level?.name,
      choiceName: reg.choice?.name,
      academicYear: reg.academicYear?.name,
      history: reg.history?.map((h: any) => ({
        status: h.toStatus,
        comment: h.publicComment,
        date: h.createdAt,
      })),
    }));
  } catch (error) {
    next(error);
  }
});

export const PublicRegistrationRouter = router;
export default router;
