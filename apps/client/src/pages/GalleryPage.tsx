/**
 * Gallery & Contact Pages.
 * - Gallery: Stitch Screen 'fb0516d4794843c1bb7f8363c282bea0'
 * - Contact: Stitch Screen '4f0951de91034f78ba4230391c94df8e'
 */

import { SEED_SCHOOLS } from '@vision-school/database';

export function GalleryPage(props?: { items?: any[]; category?: string }) {
  return {
    screenId: 'fb0516d4794843c1bb7f8363c282bea0',
    title: 'Galerie - VISION SCHOOL',
    categories: ['Tous', 'Campus', 'Laboratoires & Robotique', 'Activités Sportives', 'Événements'],
    activeCategory: props?.category || 'Tous',
    items: props?.items || [],
  };
}

export function ContactPage(props?: {
  campuses?: any[];
  selectedSchool?: any;
  openStatus?: any;
  submissionState?: { isSubmitting: boolean; isSuccess: boolean; error?: string };
}) {
  return {
    screenId: '4f0951de91034f78ba4230391c94df8e',
    title: 'Contact & Localisation - VISION SCHOOL',
    campuses: props?.campuses || SEED_SCHOOLS.filter((s) => s.isActive),
    selectedSchool: props?.selectedSchool || null,
    openStatus: props?.openStatus || null,
    submissionState: props?.submissionState || { isSubmitting: false, isSuccess: false },
  };
}
