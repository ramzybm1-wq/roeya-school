/**
 * Public Academic Year Routes (/api/public/academic-year/*)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { AcademicYearService } from '../../services/academic-year.service';
import { ApiResponse } from '@vision-school/shared';

const router = Router();

// GET /api/public/academic-year/active
router.get('/active', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const activeYear = await AcademicYearService.getActiveAcademicYear();
    res.json(
      ApiResponse.success({
        id: activeYear.id,
        name: activeYear.name,
        startDate: activeYear.startDate,
        endDate: activeYear.endDate,
        status: activeYear.status,
      })
    );
  } catch (error) {
    next(error);
  }
});

export const PublicAcademicYearsRouter = router;
export default router;
