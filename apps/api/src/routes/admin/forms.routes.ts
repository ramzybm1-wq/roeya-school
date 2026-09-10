/**
 * Admin Form Builder Routes (/api/admin/forms/*)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requirePermission } from '../../middleware/rbac.middleware';
import { FormBuilderService } from '../../services/form-builder.service';
import { ApiResponse } from '@vision-school/shared';
import { getDb, formDefinitions } from '@vision-school/database';
import { desc } from 'drizzle-orm';

const router = Router();
router.use(requireAuth());

// GET /api/admin/forms - List form definitions
router.get('/', requirePermission('form.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();
    let list = await db.select().from(formDefinitions).orderBy(desc(formDefinitions.createdAt));
    if (list.length === 0) {
      const defaultForm = await FormBuilderService.createForm({ name: 'Formulaire d’inscription Standard' }, req.user!);
      await FormBuilderService.publishForm(req.user!, defaultForm.id);
      list = await db.select().from(formDefinitions).orderBy(desc(formDefinitions.createdAt));
    }
    res.json(ApiResponse.success(list));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/forms - Create blank or clone form definition
router.post('/', requirePermission('form.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, schoolId, academicYearId, cloneFromFormId } = req.body;
    if (!name) {
      return res.status(400).json(ApiResponse.error('Le nom du formulaire est requis.', 'VALIDATION_ERROR'));
    }

    const created = await FormBuilderService.createForm({ name, schoolId, academicYearId, cloneFromFormId }, req.user!);
    res.json(ApiResponse.success(created));
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/forms/default and GET /api/admin/forms/active
// GET /api/admin/forms/:id - Full form detail
router.get('/:id', requirePermission('form.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id;
    if (id === 'default' || id === 'active') {
      const active = await FormBuilderService.resolveActiveForm(undefined, undefined, 'DRAFT');
      return res.json(ApiResponse.success(active));
    }
    const form = await FormBuilderService.loadFullFormDefinition(id);
    res.json(ApiResponse.success(form));
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/forms/:id/preview - Authenticated draft form preview
router.get('/:id/preview', requirePermission('form.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id;
    if (id === 'default' || id === 'active') {
      const active = await FormBuilderService.resolveActiveForm(undefined, undefined, 'DRAFT');
      return res.json(ApiResponse.success(active));
    }
    const form = await FormBuilderService.loadFullFormDefinition(id);
    res.json(ApiResponse.success(form));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/forms/:id/publish - Publish form version
router.post('/:id/publish', requirePermission('form.publish'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    let formId = req.params.id;
    if (formId === 'default' || formId === 'active') {
      const active = await FormBuilderService.resolveActiveForm(undefined, undefined, 'DRAFT');
      formId = active.id;
    }
    const published = await FormBuilderService.publishForm(req.user!, formId);
    res.json(ApiResponse.success(published));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/forms/sections - Add section
router.post('/sections', requirePermission('form.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { formDefinitionId, key, labelFr, labelAr, displayOrder, isVisible } = req.body;
    let targetFormId = formDefinitionId;
    if (!targetFormId || targetFormId === 'default') {
      const active = await FormBuilderService.resolveActiveForm();
      targetFormId = active.id;
    }
    if (!key || !labelFr) {
      return res.status(400).json(ApiResponse.error('key et labelFr sont requis.', 'VALIDATION_ERROR'));
    }

    const section = await FormBuilderService.addSection(req.user!, targetFormId, {
      key,
      labelFr,
      labelAr,
      displayOrder,
      isVisible,
    });
    res.json(ApiResponse.success(section));
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/forms/sections/:sectionId - Update section
router.put('/sections/:sectionId', requirePermission('form.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await FormBuilderService.updateSection(req.user!, req.params.sectionId, req.body);
    res.json(ApiResponse.success(updated));
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/forms/sections/:sectionId - Delete section
router.delete('/sections/:sectionId', requirePermission('form.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await FormBuilderService.deleteSection(req.user!, req.params.sectionId);
    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/forms/sections/:sectionId/fields - Add field
router.post('/sections/:sectionId/fields', requirePermission('form.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fieldKey, fieldType, labelFr, labelAr, placeholderFr, helpTextFr, isRequired, isVisible, optionsJson, conditionalLogicJson, width } = req.body;
    if (!fieldKey || !fieldType || !labelFr) {
      return res.status(400).json(ApiResponse.error('fieldKey, fieldType et labelFr sont requis.', 'VALIDATION_ERROR'));
    }

    const field = await FormBuilderService.addField(req.user!, req.params.sectionId, {
      fieldKey,
      fieldType,
      labelFr,
      labelAr,
      placeholderFr,
      helpTextFr,
      isRequired,
      isVisible,
      optionsJson,
      conditionalLogicJson,
      width,
    });

    res.json(ApiResponse.success(field));
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/forms/fields/:fieldId - Delete field
router.delete('/fields/:fieldId', requirePermission('form.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await FormBuilderService.deleteField(req.user!, req.params.fieldId);
    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

// PUT & PATCH /api/admin/forms/fields/:fieldId - Update field configuration
const handleFieldUpdate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await FormBuilderService.updateField(req.user!, req.params.fieldId, req.body);
    res.json(ApiResponse.success(updated));
  } catch (error) {
    next(error);
  }
};
router.put('/fields/:fieldId', requirePermission('form.manage'), handleFieldUpdate);
router.patch('/fields/:fieldId', requirePermission('form.manage'), handleFieldUpdate);

export const AdminFormsRouter = router;
export default router;
