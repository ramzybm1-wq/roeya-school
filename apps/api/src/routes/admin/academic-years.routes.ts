/**
 * Admin Academic Years Routes (/api/admin/academic-years/*)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requirePermission } from '../../middleware/rbac.middleware';
import { AcademicYearService } from '../../services/academic-year.service';
import { ApiResponse } from '@vision-school/shared';

const router = Router();
router.use(requireAuth());

// GET /api/admin/academic-years - List all academic years
router.get('/', requirePermission('academic_year.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const years = await AcademicYearService.getAllAcademicYears(req.user);
    res.json(ApiResponse.success(years));
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/academic-years/active - Get current active default year
router.get('/active', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const active = await AcademicYearService.getActiveAcademicYear();
    res.json(ApiResponse.success(active));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/academic-years - Create new academic year
router.post('/', requirePermission('academic_year.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const newYear = await AcademicYearService.createAcademicYear(req.user!, req.body);
    res.json(ApiResponse.success(newYear));
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/academic-years/:id - Get year by ID
router.get('/:id', requirePermission('academic_year.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const year = await AcademicYearService.getYearById(req.params.id);
    res.json(ApiResponse.success(year));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/academic-years/:id/activate - Atomically activate year
router.post('/:id/activate', requirePermission('academic_year.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activated = await AcademicYearService.activateAcademicYear(req.user!, req.params.id);
    res.json(ApiResponse.success(activated));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/academic-years/:id/close - Close academic year
router.post('/:id/close', requirePermission('academic_year.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const closed = await AcademicYearService.closeAcademicYear(req.user!, req.params.id);
    res.json(ApiResponse.success(closed));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/academic-years/:id/archive - Archive academic year
router.post('/:id/archive', requirePermission('academic_year.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const archived = await AcademicYearService.archiveAcademicYear(req.user!, req.params.id);
    res.json(ApiResponse.success(archived));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/academic-years/prepare-next-year/preview
router.post('/prepare-next-year/preview', requirePermission('academic_year.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sourceYearId, destYearId } = req.body;
    const preview = await AcademicYearService.previewPrepareNextYear(req.user!, sourceYearId, destYearId);
    res.json(ApiResponse.success(preview));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/academic-years/prepare-next-year
router.post('/prepare-next-year', requirePermission('academic_year.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sourceYearId, destYearId, copyTariffs } = req.body;
    const result = await AcademicYearService.prepareNextYear(req.user!, sourceYearId, destYearId, { copyTariffs });
    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

export const AdminAcademicYearsRouter = router;
export default router;
