/**
 * Admin Educational Choices & Branching Routes (/api/admin/choices)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requireAnyPermission } from '../../middleware/rbac.middleware';
import { ChoiceService } from '../../services/choice.service';
import { ApiResponse } from '@vision-school/shared';

const router = Router();
router.use(requireAuth());

// GET /api/admin/choices/by-level/:levelId
router.get('/by-level/:levelId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const choices = await ChoiceService.getChoicesByLevel(req.params.levelId, includeInactive);
    res.json(ApiResponse.success(choices));
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/choices/by-level/:levelId/flat
router.get('/by-level/:levelId/flat', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const choices = await ChoiceService.getFlatChoicesByLevel(req.params.levelId, includeInactive);
    res.json(ApiResponse.success(choices));
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/choices/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const choice = await ChoiceService.getChoiceById(req.params.id);
    res.json(ApiResponse.success(choice));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/choices
router.post('/', requireAnyPermission(['education.manage', 'school.manage']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const newChoice = await ChoiceService.createChoice(req.user!, req.body);
    res.json(ApiResponse.success(newChoice));
  } catch (error) {
    next(error);
  }
});

// PUT /api/admin/choices/:id
router.put('/:id', requireAnyPermission(['education.manage', 'school.manage']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = await ChoiceService.updateChoice(req.user!, req.params.id, req.body);
    res.json(ApiResponse.success(updated));
  } catch (error) {
    next(error);
  }
});

// DELETE /api/admin/choices/:id
router.delete('/:id', requireAnyPermission(['education.delete', 'education.manage', 'school.manage']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await ChoiceService.deleteChoice(req.user!, req.params.id);
    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

export const AdminChoicesRouter = router;
export default router;
