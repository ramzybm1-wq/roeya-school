/**
 * School Presentation Page (Notre école) - Stitch Screen '9a2788e65bf94e5d84aba9dcd1bd9066'.
 * Fully connects to live PublicContentService school presentation data.
 */

import { SEED_SCHOOLS } from '@vision-school/database';

export interface SchoolPageProps {
  school?: any;
  educationalApproach?: any;
  facilities?: any[];
  values?: any[];
  gallery?: any[];
  heroMedia?: any;
}

export function SchoolPage(props?: SchoolPageProps) {
  const defaultCampuses = SEED_SCHOOLS.filter((s) => s.isActive);

  return {
    screenId: '9a2788e65bf94e5d84aba9dcd1bd9066',
    title: props?.school?.name ? `${props.school.name} - VISION SCHOOL` : 'Notre école - VISION SCHOOL',
    school: props?.school || null,
    heroMedia: props?.heroMedia || null,
    pedagogy: props?.educationalApproach || {
      titleFr: 'Notre Projet Pédagogique d’Excellence',
      descriptionFr:
        'À VISION SCHOOL, nous combinons l’exigence du programme national avec une ouverture internationale et des méthodes actives favorisant l’autonomie et l’esprit critique.',
    },
    values: props?.values || [],
    facilities: props?.facilities || [],
    gallery: props?.gallery || [],
    campuses: defaultCampuses,
  };
}
