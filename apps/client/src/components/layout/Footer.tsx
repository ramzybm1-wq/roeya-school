/**
 * Public Client Footer Component.
 */

export function Footer({ locale = 'fr' }: { locale?: 'fr' | 'ar' }) {
  const isAr = locale === 'ar';
  return {
    componentName: 'Footer',
    locale,
    brandName: isAr ? 'مدرسة فيزيون' : 'VISION SCHOOL',
    tagline: isAr ? 'التميز التعليمي والتربوي' : 'Excellence & Réussite Éducative',
    copyright: '© 2026 VISION SCHOOL. Tous droits réservés.',
    legalLinks: [
      { href: '/confidentialite', label: 'Politique de confidentialité' },
      { href: '/faq', label: 'Questions fréquentes (FAQ)' },
    ],
  };
}
