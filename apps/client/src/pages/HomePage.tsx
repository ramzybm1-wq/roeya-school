/**
 * Home Page (Accueil) - Stitch Screen 'c835e6c8f0d24f4185955b52a7be3c65'.
 * Fully connects to live PublicContentService payload (Hero, Announcements, Values, School cards, Cycles, Gallery).
 */

import { SEED_SCHOOLS, SEED_CYCLES, SEED_ACADEMIC_YEARS } from '@vision-school/database';

export interface HomePageProps {
  branding?: any;
  hero?: any;
  announcementBanner?: any;
  values?: any[];
  schools?: any[];
  activeCycles?: any[];
  activeAcademicYear?: any;
  galleryPreview?: any[];
}

export function HomePage(props?: HomePageProps) {
  const activeYear =
    props?.activeAcademicYear?.name ||
    SEED_ACADEMIC_YEARS.find((y) => y.isActiveDefault)?.name ||
    '2026 / 2027';
  const schools = props?.schools || SEED_SCHOOLS.filter((s) => s.isActive);
  const cycles = props?.activeCycles || SEED_CYCLES.filter((c) => c.isActive);

  return {
    screenId: 'c835e6c8f0d24f4185955b52a7be3c65',
    title: 'Accueil - VISION SCHOOL',
    branding: props?.branding || null,
    hero: props?.hero || {
      headlineFr: 'L’Excellence Éducative pour Construire l’Avenir de Votre Enfant',
      subtitleFr: `Inscriptions ouvertes pour l’année scolaire ${activeYear}`,
      ctaPrimary: { labelFr: 'Déposer un dossier d’inscription', href: '/admissions/inscription' },
      ctaSecondary: { labelFr: 'Découvrir nos établissements', href: '/ecole' },
    },
    announcementBanner: props?.announcementBanner || null,
    values: props?.values || [],
    schools,
    cycles,
    galleryPreview: props?.galleryPreview || [],
  };
}
