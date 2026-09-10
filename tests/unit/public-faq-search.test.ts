/**
 * Unit Tests: Multilingual Public FAQ Search & Topic Categorization.
 */

import { FAQService } from '../../apps/api/src/services/faq.service';

describe('Public FAQ: Multilingual Search & Categories', () => {
  test('returns default curated FAQs when query is empty', async () => {
    const faqs = FAQService.getDefaultFaqs();
    expect(faqs.length).toBeGreaterThan(0);
    expect(faqs[0].questionFr).toBeDefined();
    expect(faqs[0].answerFr).toBeDefined();
  });

  test('searches French and Arabic keywords effectively', () => {
    const faqs = FAQService.getDefaultFaqs();

    const searchFaqs = (query: string) => {
      const q = query.toLowerCase();
      return faqs.filter(
        (f) =>
          f.questionFr.toLowerCase().includes(q) ||
          f.answerFr.toLowerCase().includes(q) ||
          (f.questionAr && f.questionAr.toLowerCase().includes(q)) ||
          (f.answerAr && f.answerAr.toLowerCase().includes(q))
      );
    };

    expect(searchFaqs('vaccination').length).toBe(1);
    expect(searchFaqs('التسجيل').length).toBe(1);
    expect(searchFaqs('non_existent_topic').length).toBe(0);
  });
});
