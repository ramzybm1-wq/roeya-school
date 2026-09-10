/**
 * Admin School-Year Levels & Capacity Routes (/api/admin/school-year-levels/*)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requirePermission } from '../../middleware/rbac.middleware';
import { SchoolYearLevelService } from '../../services/school-year-level.service';
import { CapacityService } from '../../services/capacity.service';
import { ApiResponse } from '@vision-school/shared';

const router = Router();
router.use(requireAuth());

// GET /api/admin/school-year-levels - List configurations with filters
router.get('/', requirePermission('capacity.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.query.schoolId as string | undefined;
    const academicYearId = req.query.academicYearId as string | undefined;
    const cycleId = req.query.cycleId as string | undefined;
    const registrationOpen = req.query.registrationOpen !== undefined ? req.query.registrationOpen === 'true' : undefined;

    const results = await SchoolYearLevelService.getSchoolYearLevelsAdmin(req.user!, {
      schoolId,
      academicYearId,
      cycleId,
      registrationOpen,
    });

    res.json(ApiResponse.success(results));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/school-year-levels - Create new configuration
router.post('/', requirePermission('capacity.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const newSyl = await SchoolYearLevelService.createSchoolYearLevel(req.user!, req.body);
    res.json(ApiResponse.success(newSyl));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/school-year-levels/:id/open - Open registrations
router.post('/:id/open', requirePermission('capacity.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await SchoolYearLevelService.openRegistration(req.user!, req.params.id);
    res.json(ApiResponse.success(updated));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/school-year-levels/:id/close - Close registrations
router.post('/:id/close', requirePermission('capacity.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await SchoolYearLevelService.closeRegistration(req.user!, req.params.id);
    res.json(ApiResponse.success(updated));
  } catch (error) {
    next(error);
  }
});

// PATCH /api/admin/school-year-levels/:id/capacity - Update capacity max and quotas
router.patch('/:id/capacity', requirePermission('capacity.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = await CapacityService.updateCapacity(req.user!, req.params.id, req.body);
    res.json(ApiResponse.success(summary));
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/school-year-levels/:id/capacity-summary - Get live capacity summary
router.get('/:id/capacity-summary', requirePermission('capacity.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = await CapacityService.getCapacitySummary(req.params.id);
    res.json(ApiResponse.success(summary));
  } catch (error) {
    next(error);
  }
});

// PUT & PATCH /api/admin/school-year-levels/:id - Update level configuration
const handleSylUpdate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await SchoolYearLevelService.updateSchoolYearLevel(req.user!, req.params.id, req.body);
    res.json(ApiResponse.success(updated));
  } catch (error) {
    next(error);
  }
};
router.put('/:id', requirePermission('capacity.manage'), handleSylUpdate);
router.patch('/:id', requirePermission('capacity.manage'), handleSylUpdate);

// DELETE /api/admin/school-year-levels/:id - Delete or archive configuration
router.delete('/:id', requirePermission('capacity.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await SchoolYearLevelService.deleteSchoolYearLevel(req.user!, req.params.id);
    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

export const AdminSchoolYearLevelsRouter = router;
export default router;
