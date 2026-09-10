/**
 * Public Educational Cycles Routes (/api/public/cycles)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { LevelService } from '../../services/level.service';
import { ApiResponse } from '@vision-school/shared';

const router = Router();

// GET /api/public/cycles
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cycles = await LevelService.getCycles();
    res.json(ApiResponse.success(cycles));
  } catch (error) {
    next(error);
  }
});

export const PublicCyclesRouter = router;
export default router;
