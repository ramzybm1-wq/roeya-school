/**
 * Admin Waiting List Management Routes (/api/admin/waiting-list/*)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requirePermission } from '../../middleware/rbac.middleware';
import { WaitingListService } from '../../services/waiting-list.service';
import { ApiResponse } from '@vision-school/shared';

const router = Router();
router.use(requireAuth());

// GET /api/admin/waiting-list - List queue items for a level
router.get('/', requirePermission('waitinglist.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolYearLevelId = req.query.schoolYearLevelId as string;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;

    if (!schoolYearLevelId) {
      return res.status(400).json(ApiResponse.error('Le paramètre schoolYearLevelId est requis.', 'VALIDATION_ERROR'));
    }

    const queue = await WaitingListService.getQueue(schoolYearLevelId, { status, search });
    res.json(ApiResponse.success(queue));
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/waiting-list/summary/:schoolYearLevelId - Get level waiting summary card
router.get('/summary/:schoolYearLevelId', requirePermission('waitinglist.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const summary = await WaitingListService.getWaitingSummary(req.params.schoolYearLevelId);
    res.json(ApiResponse.success(summary));
  } catch (error) {
    next(error);
  }
});

// GET /api/admin/waiting-list/analytics - Get waiting list conversion KPIs
router.get('/analytics', requirePermission('waitinglist.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.query.schoolId as string | undefined;
    const analytics = await WaitingListService.getWaitingAnalytics(req.user!, schoolId);
    res.json(ApiResponse.success(analytics));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/waiting-list/:id/promote - Promote candidate to ACCEPTED
router.post('/:id/promote', requirePermission('waitinglist.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await WaitingListService.promoteCandidate(req.user!, req.params.id);
    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/waiting-list/:id/offer - Create place offer with optional reservation
router.post('/:id/offer', requirePermission('waitinglist.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await WaitingListService.createPlaceOffer(req.user!, req.params.id, req.body);
    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/waiting-list/:id/skip - Temporarily skip candidate
router.post('/:id/skip', requirePermission('waitinglist.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await WaitingListService.skipCandidate(req.user!, req.params.id, req.body);
    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/waiting-list/:id/reactivate - Reactivate skipped candidate
router.post('/:id/reactivate', requirePermission('waitinglist.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await WaitingListService.reactivateCandidate(req.user!, req.params.id);
    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/waiting-list/:id/remove - Explicitly remove from queue
router.post('/:id/remove', requirePermission('waitinglist.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await WaitingListService.removeFromWaitingList(req.user!, req.params.id, req.body);
    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/waiting-list/transfer - Transfer candidate to new level/school
router.post('/transfer', requirePermission('waitinglist.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { registrationId, destinationSchoolYearLevelId } = req.body;
    const result = await WaitingListService.transferCandidate(req.user!, registrationId, destinationSchoolYearLevelId);
    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

export const AdminWaitingListRouter = router;
export default router;
