/**
 * Public Content Routes (/api/public/*)
 * Handles homepage data, school presentation ("Notre École"), contact submissions, and FAQs.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { PublicContentService } from '../../services/public-content.service';
import { ContactService } from '../../services/contact.service';
import { FAQService } from '../../services/faq.service';
import { ApiResponse } from '@vision-school/shared';

const router = Router();

// GET /api/public/home - Composite Homepage payload
router.get('/home', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.query.schoolId as string | undefined;
    const language = (req.query.language as string) || 'fr';

    const data = await PublicContentService.getHomePageContent(schoolId, language);
    res.json(ApiResponse.success(data));
  } catch (error) {
    next(error);
  }
});

// GET /api/public/schools/:schoolId/presentation - "Notre École" Presentation
router.get('/schools/:schoolId/presentation', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { schoolId } = req.params;
    const language = (req.query.language as string) || 'fr';

    const data = await PublicContentService.getSchoolPresentation(schoolId, language);
    res.json(ApiResponse.success(data));
  } catch (error) {
    next(error);
  }
});

// POST /api/public/contact - Contact Form Submission
router.post('/contact', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const result = await ContactService.submitContactMessage(req.body, clientIp);
    res.json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
});

// GET /api/public/faq - Searchable FAQ
router.get('/faq', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolId = req.query.schoolId as string | undefined;
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;
    const isFeatured = req.query.featured ? req.query.featured === 'true' : undefined;
    const language = (req.query.language as string) || 'fr';

    const faqs = await FAQService.getPublicFaqs({
      schoolId,
      category,
      search,
      isFeatured,
      language,
    });

    res.json(ApiResponse.success(faqs));
  } catch (error) {
    next(error);
  }
});

export const PublicContentRouter = router;
export default router;
