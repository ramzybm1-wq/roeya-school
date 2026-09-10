/**
 * Admin Tariffs & Fee Configuration Routes (/api/admin/tariffs/*)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requirePermission } from '../../middleware/rbac.middleware';
import { TariffService } from '../../services/tariff.service';
import { ApiResponse } from '@vision-school/shared';

const router = Router();
router.use(requireAuth());

// GET /api/admin/tariffs - List tariffs with school/year filters
router.get('/', requirePermission('tariff.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.query.schoolId as string | undefined;
    const academicYearId = req.query.academicYearId as string | undefined;
    const schoolYearLevelId = req.query.schoolYearLevelId as string | undefined;

    const list = await TariffService.getTariffs(req.user!, {
      schoolId,
      academicYearId,
      schoolYearLevelId,
    });

    res.json(ApiResponse.success(list));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/tariffs - Create new tariff
router.post('/', requirePermission('tariff.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const newTariff = await TariffService.createTariff(req.user!, req.body);
    res.json(ApiResponse.success(newTariff));
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/tariffs/:id - Versioned update of tariff
router.put('/:id', requirePermission('tariff.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await TariffService.updateTariff(req.user!, req.params.id, req.body);
    res.json(ApiResponse.success(updated));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/tariffs/bulk-visibility - Toggle client visibility on multiple tariffs
router.post('/bulk-visibility', requirePermission('tariff.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tariffIds, showClient } = req.body;
    const result = await TariffService.bulkToggleVisibility(req.user!, tariffIds, showClient);
    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/tariffs/copy-to-year - Copy tariffs to next academic year with adjustments
router.post('/copy-to-year', requirePermission('tariff.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sourceYearId, destYearId, adjustment } = req.body;
    const result = await TariffService.copyTariffsToNextYear(req.user!, sourceYearId, destYearId, adjustment);
    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/tariffs/:id - Deactivate / archive tariff
router.delete('/:id', requirePermission('tariff.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await TariffService.deleteTariff(req.user!, req.params.id);
    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

export const AdminTariffsRouter = router;
export default router;
