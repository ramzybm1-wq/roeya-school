/**
 * Admin Cycles and Levels Routes (/api/admin/cycles, /api/admin/levels)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requirePermission, requireSuperAdmin, requireAnyPermission } from '../../middleware/rbac.middleware';
import { LevelService } from '../../services/level.service';
import { ApiResponse } from '@vision-school/shared';

const router = Router();
router.use(requireAuth());

// GET /api/admin/cycles/tree
router.get('/cycles/tree', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const tree = await LevelService.getCycleTree(includeInactive);
    res.json(ApiResponse.success(tree));
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/cycles
router.get('/cycles', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cycles = await LevelService.getAllCyclesAdmin(req.user!);
    res.json(ApiResponse.success(cycles));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/cycles
router.post('/cycles', requireAnyPermission(['education.manage', 'school.manage']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const newCycle = await LevelService.createCycle(req.user!, req.body);
    res.json(ApiResponse.success(newCycle));
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/cycles/:id
router.put('/cycles/:id', requireAnyPermission(['education.manage', 'school.manage']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await LevelService.updateCycle(req.user!, req.params.id, req.body);
    res.json(ApiResponse.success(updated));
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/cycles/:id
router.delete('/cycles/:id', requireAnyPermission(['education.delete', 'education.manage']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await LevelService.deleteCycle(req.user!, req.params.id);
    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/levels
router.get('/levels', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const levels = await LevelService.getAllLevels();
    res.json(ApiResponse.success(levels));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/levels
router.post('/levels', requireAnyPermission(['education.manage', 'school.manage', 'capacity.manage']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const newLevel = await LevelService.createLevel(req.user!, req.body);
    res.json(ApiResponse.success(newLevel));
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/levels/:id
router.put('/levels/:id', requireAnyPermission(['education.manage', 'school.manage', 'capacity.manage']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await LevelService.updateLevel(req.user!, req.params.id, req.body);
    res.json(ApiResponse.success(updated));
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/levels/:id
router.delete('/levels/:id', requireAnyPermission(['education.delete', 'education.manage', 'school.manage', 'capacity.manage']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await LevelService.deleteLevel(req.user!, req.params.id);
    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

export const AdminCyclesLevelsRouter = router;
export default router;
