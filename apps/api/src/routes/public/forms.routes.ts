/**
 * Public Form Routes (/api/public/registration-form)
 * Resolves active published dynamic registration form schema for clients.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { FormBuilderService } from '../../services/form-builder.service';
import { ApiResponse } from '@vision-school/shared';

const router = Router();

// GET /api/public/registration-form - Resolves active published form
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.query.schoolId as string | undefined;
    const academicYearId = req.query.academicYearId as string | undefined;
    const levelId = req.query.levelId as string | undefined;
    const cycleId = req.query.cycleId as string | undefined;
    const choiceId = req.query.choiceId as string | undefined;
    const isPreview = req.query.preview === 'true';

    const form = await FormBuilderService.resolveActiveForm(
      schoolId,
      academicYearId,
      isPreview ? 'DRAFT' : 'PUBLISHED'
    );

    const docSec = form.sections.find((s) => s.key === 'step_documents');
    const docVisible = docSec ? docSec.isVisible : true;

    // Sanitize internal metadata for public response
    const sanitized = {
      id: form.id,
      name: form.name,
      version: form.version,
      status: form.status,
      documentStep: {
        isVisible: docVisible,
        labelFr: docSec?.labelFr || 'Étape 4 — Documents',
        labelAr: docSec?.labelAr || 'المرحلة 4 — الوثائق',
        descriptionFr: docSec?.descriptionFr || 'Joignez les pièces justificatives requises. Vous pouvez aussi les envoyer ultérieurement par email ou en personne.',
        descriptionAr: docSec?.descriptionAr || 'يرجى إرفاق الوثائق المطلوبة.',
        displayOrder: docSec?.displayOrder || 4,
      },
      sections: form.sections
        .filter((s) => s.isVisible)
        .map((s) => ({
          key: s.key,
          labelFr: s.labelFr,
          labelAr: s.labelAr,
          descriptionFr: s.descriptionFr || null,
          descriptionAr: s.descriptionAr || null,
          displayOrder: s.displayOrder,
          fields: s.fields
            .filter((f) => {
              if (!f.isVisible) return false;
              if (f.scopeJson) {
                const sc = f.scopeJson as any;
                if (sc.schoolId && schoolId && sc.schoolId !== schoolId) return false;
                if (sc.cycleId && cycleId && sc.cycleId !== cycleId) return false;
                if (sc.levelId && levelId && sc.levelId !== levelId) return false;
                if (sc.choiceId && choiceId && sc.choiceId !== choiceId) return false;
              }
              return true;
            })
            .map((f) => ({
              id: f.id,
              fieldKey: f.fieldKey,
              fieldType: f.fieldType,
              labelFr: f.labelFr,
              labelAr: f.labelAr,
              placeholderFr: f.placeholderFr,
              placeholderAr: f.placeholderAr,
              helpTextFr: f.helpTextFr,
              helpTextAr: f.helpTextAr,
              isVisible: f.isVisible,
              isRequired: f.isRequired,
              isEditableClient: f.isEditableClient,
              isSystemProtected: f.isSystemProtected,
              options: f.optionsJson || null,
              validation: f.validationJson || null,
              conditionalLogic: f.conditionalLogicJson || null,
              scope: f.scopeJson || null,
              displayOrder: f.displayOrder,
              width: f.width,
            })),
        })),
    };

    res.json(ApiResponse.success(sanitized));
  } catch (error) {
    next(error);
  }
});

export const PublicFormRouter = router;
export default router;
