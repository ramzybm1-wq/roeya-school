/**
 * Admin Educational Transitions & Progression Routes (/api/admin/transitions)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireAnyPermission } from '../../middleware/rbac.middleware';
import { TransitionService } from '../../services/transition.service';
import { ApiResponse } from '@vision-school/shared';

const router = Router();
router.use(requireAuth());

// GET /api/admin/transitions
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = {
      fromLevelId: req.query.fromLevelId as string | undefined,
      toLevelId: req.query.toLevelId as string | undefined,
    };
    const transitions = await TransitionService.getTransitions(filters);
    res.json(ApiResponse.success(transitions));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/transitions
router.post('/', requireAnyPermission(['education.manage', 'school.manage']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const newTransition = await TransitionService.createTransition(req.user!, req.body);
    res.json(ApiResponse.success(newTransition));
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/transitions/:id
router.delete('/:id', requireAnyPermission(['education.manage', 'school.manage']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await TransitionService.deleteTransition(req.user!, req.params.id);
    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

export const AdminTransitionsRouter = router;
export default router;
