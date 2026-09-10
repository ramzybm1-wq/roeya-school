/**
 * Admissions & Levels Page - Stitch Screen '72cdffb36b6341918237d51cad00863e'.
 * Connects to live educational cycles, active grade levels, and sanitized public availability.
 */

import { SEED_CYCLES, SEED_LEVELS } from '@vision-school/database';

export interface AdmissionsPageProps {
  cycles?: any[];
  levels?: any[];
  selectedSchoolId?: string;
}

export function AdmissionsPage(props?: AdmissionsPageProps) {
  const cycles = props?.cycles || SEED_CYCLES.filter((c) => c.isActive);
  const levels = props?.levels || SEED_LEVELS.filter((l) => l.isActive);

  return {
    screenId: '72cdffb36b6341918237d51cad00863e',
    title: 'Niveaux & Admissions - VISION SCHOOL',
    cycles: cycles.map((c) => ({
      ...c,
      levels: levels.filter((l) => l.cycleId === c.id),
    })),
    admissionSteps: [
      { step: 1, title: 'Formulaire de pré-inscription en ligne' },
      { step: 2, title: 'Téléversement des pièces justificatives' },
      { step: 3, title: 'Examen du dossier & Test de niveau' },
      { step: 4, title: 'Confirmation d’inscription définitive' },
    ],
  };
}
