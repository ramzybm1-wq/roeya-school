/**
 * Public Establishment Routes (/api/public/schools/*)
 * Returns public-safe establishment information with zero internal data leakage.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { SchoolService } from '../../services/school.service';
import { ApiResponse } from '@vision-school/shared';

const router = Router();

// GET /api/public/schools
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schools = await SchoolService.getPublicSchools();
    res.json(ApiResponse.success(schools));
  } catch (error) {
    next(error);
  }
});

// GET /api/public/schools/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const school = await SchoolService.getPublicSchoolById(req.params.id);
    res.json(ApiResponse.success(school));
  } catch (error) {
    next(error);
  }
});

export const PublicSchoolsRouter = router;
export default router;
