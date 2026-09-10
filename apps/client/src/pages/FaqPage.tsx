/**
 * FAQ & Legal Pages.
 * - FAQ: Stitch Screen '8c031ee0980345cd9ed810e1be13eb5e'
 * - Legal & Privacy: Stitch Screen 'e167d17200254585b860898e162724a2'
 */

export interface FaqPageProps {
  faqs?: Array<{
    id: string;
    category?: string;
    questionFr: string;
    questionAr?: string;
    answerFr: string;
    answerAr?: string;
    isFeatured?: boolean;
  }>;
  categories?: string[];
  activeCategory?: string;
  searchQuery?: string;
}

export function FaqPage(props?: FaqPageProps) {
  return {
    screenId: '8c031ee0980345cd9ed810e1be13eb5e',
    title: 'FAQ / Questions fréquentes - VISION SCHOOL',
    categories: props?.categories || ['Tous', 'INSCRIPTION', 'DOCUMENTS', 'LISTE_ATTENTE', 'SERVICES'],
    activeCategory: props?.activeCategory || 'Tous',
    searchQuery: props?.searchQuery || '',
    faqs: props?.faqs || [],
  };
}

export function LegalPage() {
  return {
    screenId: 'e167d17200254585b860898e162724a2',
    title: 'Politique de Confidentialité & Mentions Légales - VISION SCHOOL',
    lastUpdated: '2026-01-01',
  };
}
