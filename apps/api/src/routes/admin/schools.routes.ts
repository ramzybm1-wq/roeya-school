/**
 * Admin School Establishment Routes (/api/admin/schools/*)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requirePermission } from '../../middleware/rbac.middleware';
import { SchoolService } from '../../services/school.service';
import { ApiResponse, AppError } from '@vision-school/shared';
import { AuthGuard } from '@vision-school/auth';

const router = Router();
router.use(requireAuth());

// GET /api/admin/schools - List establishments
router.get('/', requirePermission('school.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    const schools = await SchoolService.getAllSchools(req.user!, { status, search });
    res.json(ApiResponse.success(schools));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/schools - Create establishment
router.post('/', requirePermission('school.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const newSchool = await SchoolService.createSchool(req.user!, req.body);
    res.json(ApiResponse.success(newSchool));
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/schools/:id/delete-preview - Get dependency breakdown before permanent deletion
router.get('/:id/delete-preview', requirePermission('school.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const preview = await SchoolService.getSchoolDeletePreview(req.user!, req.params.id);
    res.json(ApiResponse.success(preview));
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/schools/:id - Get establishment by ID
router.get('/:id', requirePermission('school.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const school = await SchoolService.getSchoolById(req.user!, req.params.id);
    res.json(ApiResponse.success(school));
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/schools/:id - Update establishment
router.put('/:id', requirePermission('school.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await SchoolService.updateSchool(req.user!, req.params.id, req.body);
    res.json(ApiResponse.success(updated));
  } catch (error) {
    next(error);
  }
});

// PATCH /api/admin/schools/:id - Partial update establishment
router.patch('/:id', requirePermission('school.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await SchoolService.updateSchool(req.user!, req.params.id, req.body);
    res.json(ApiResponse.success(updated));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/schools/:id/activate
router.post('/:id/activate', requirePermission('school.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await SchoolService.activateSchool(req.user!, req.params.id);
    res.json(ApiResponse.success(updated));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/schools/:id/deactivate
router.post('/:id/deactivate', requirePermission('school.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await SchoolService.deactivateSchool(req.user!, req.params.id);
    res.json(ApiResponse.success(updated));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/schools/:id/archive
router.post('/:id/archive', requirePermission('school.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await SchoolService.archiveSchool(req.user!, req.params.id);
    res.json(ApiResponse.success(updated));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/schools/:id/restore
router.post('/:id/restore', requirePermission('school.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const restored = await SchoolService.restoreSchool(req.user!, req.params.id);
    res.json(ApiResponse.success(restored));
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/schools/:id?permanent=true - Permanent deletion (SUPER_ADMIN only, school.delete permission)
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const permanent = req.query.permanent === 'true';

    if (permanent) {
      // Strict: only SUPER_ADMIN / school.delete permission can permanently delete
      if (!req.user || (!AuthGuard.isSuperAdmin(req.user) && !AuthGuard.hasPermission(req.user, 'school.delete'))) {
        return next(AppError.forbidden('Permission refusée : seul le Super Administrateur peut procéder à la suppression définitive d\'un établissement.'));
      }
      const result = await SchoolService.permanentDeleteSchool(req.user!, req.params.id);
      return res.json(ApiResponse.success(result));
    }

    // Archive path: school.manage is sufficient
    if (!req.user || !AuthGuard.hasPermission(req.user, 'school.manage')) {
      return next(AppError.forbidden('Permission refusée.'));
    }
    const result = await SchoolService.archiveSchool(req.user!, req.params.id);
    return res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

export const AdminSchoolsRouter = router;
export default router;
