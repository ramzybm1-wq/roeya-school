/**
 * Public Client Navigation Bar Component.
 * Visually consistent with Stitch design.
 */

export interface NavbarProps {
  currentPath?: string;
  locale?: 'fr' | 'ar';
  onLocaleChange?: (locale: 'fr' | 'ar') => void;
}

export function Navbar({ currentPath = '/', locale = 'fr' }: NavbarProps) {
  const isAr = locale === 'ar';

  const navLinks = [
    { href: '/', label: isAr ? 'الرئيسية' : 'Accueil' },
    { href: '/ecole', label: isAr ? 'مدرستنا' : 'Notre École' },
    { href: '/admissions', label: isAr ? 'Niveaux & Admissions' : 'Niveaux & Admissions' },
    { href: '/galerie', label: isAr ? 'معرض الصور' : 'Galerie' },
    { href: '/contact', label: isAr ? 'الاتصال' : 'Contact' },
    { href: '/suivi', label: isAr ? 'متابعة الملف' : 'Suivi de dossier' },
  ];

  return {
    componentName: 'Navbar',
    locale,
    currentPath,
    links: navLinks,
    academicYearBadge: '2026 / 2027',
    registrationCta: {
      label: isAr ? 'التسجيل الأولي' : 'Pré-inscription 2026/2027',
      href: '/inscription',
    },
  };
}
