/**
 * Public Grade Levels & Availability Routes (/api/public/levels/* & /api/public/schools/:schoolId/levels)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { SchoolYearLevelService } from '../../services/school-year-level.service';
import { LevelService } from '../../services/level.service';
import { ChoiceService } from '../../services/choice.service';
import { ApiResponse } from '@vision-school/shared';

const router = Router({ mergeParams: true });

// GET /api/public/levels/tree (Full public educational tree)
router.get('/tree', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tree = await ChoiceService.getFullEducationalTree(false);
    res.json(ApiResponse.success(tree));
  } catch (error) {
    next(error);
  }
});

// GET /api/public/levels (Global active grade levels)
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const levels = await LevelService.getAllLevels();
    res.json(ApiResponse.success(levels));
  } catch (error) {
    next(error);
  }
});

// GET /api/public/levels/:levelId/choices
router.get('/:levelId/choices', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { levelId } = req.params;
    const choices = await ChoiceService.getChoicesByLevel(levelId, false);
    res.json(ApiResponse.success(choices));
  } catch (error) {
    next(error);
  }
});

// GET /api/public/levels/:schoolId
router.get('/:schoolId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { schoolId } = req.params;
    const academicYearId = req.query.academicYearId as string | undefined;

    const levels = await SchoolYearLevelService.getPublicSchoolLevels(schoolId, academicYearId);
    res.json(ApiResponse.success(levels));
  } catch (error) {
    next(error);
  }
});

// GET /api/public/schools/:schoolId/levels
router.get('/:schoolId/levels', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { schoolId } = req.params;
    const academicYearId = req.query.academicYearId as string | undefined;

    const levels = await SchoolYearLevelService.getPublicSchoolLevels(schoolId, academicYearId);
    res.json(ApiResponse.success(levels));
  } catch (error) {
    next(error);
  }
});

export const PublicLevelsRouter = router;
export default router;
