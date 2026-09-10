/**
 * Admin Dashboard Route Handler (/api/admin/dashboard/*)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requirePermission } from '../../middleware/rbac.middleware';
import { DashboardService } from '../../services/dashboard.service';
import { ApiResponse } from '@vision-school/shared';

const router = Router();
router.use(requireAuth());

// GET /api/admin/dashboard/metrics
router.get('/metrics', requirePermission('dashboard.read'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolIdFilter = req.query.schoolId as string | undefined;
    const metrics = await DashboardService.getMetrics(req.user!, schoolIdFilter);
    res.json(ApiResponse.success(metrics));
  } catch (error) {
    next(error);
  }
});

export const AdminDashboardRouter = router;
export default router;
