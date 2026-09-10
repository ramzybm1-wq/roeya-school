/**
 * Admin Content & Messaging Routes (/api/admin/content/* & /api/admin/contact-messages/*)
 */

import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth, requirePermission } from '../../middleware/rbac.middleware';
import { ContactService } from '../../services/contact.service';
import { FAQService } from '../../services/faq.service';
import { ApiResponse } from '@vision-school/shared';

const router = Router();
router.use(requireAuth());

// GET /api/admin/contact-messages - List contact messages
router.get('/contact-messages', requirePermission('contact.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const list = await ContactService.getAdminContactMessages(req.user!, {
      schoolId: req.query.schoolId as string,
      status: req.query.status as string,
    });
    res.json(ApiResponse.success(list));
  } catch (error) {
    next(error);
  }
});

// PATCH /api/admin/contact-messages/:id - Update contact message status
router.patch('/contact-messages/:id', requirePermission('contact.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, assignedUserId } = req.body;
    const updated = await ContactService.updateContactStatus(req.user!, req.params.id, status, assignedUserId);
    res.json(ApiResponse.success(updated));
  } catch (error) {
    next(error);
  }
});

// POST /api/admin/faq - Create FAQ item
router.post('/faq', requirePermission('content.manage'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const created = await FAQService.createFaq(req.user!, req.body);
    res.json(ApiResponse.success(created));
  } catch (error) {
    next(error);
  }
});

export const AdminContentRouter = router;
export default router;
