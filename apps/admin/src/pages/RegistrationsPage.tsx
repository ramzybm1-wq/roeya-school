/**
 * Admin Registrations List Page - Stitch Screen '99fc5771fbae427b984232da295018a1'.
 * Admin Registration Detail Page - Stitch Screens '0f5e911f59034de4ad8c0c75fc90961b' / 'abc386e9d98a4f9ea252f33aa832228c'.
 */

import { AdminMockAdapter } from '@vision-school/ui-shared';

export function RegistrationsListPage() {
  const registrations = AdminMockAdapter.getRecentRegistrations();

  return {
    screenId: '99fc5771fbae427b984232da295018a1',
    title: 'Gestion des Inscriptions - VISION SCHOOL',
    filters: {
      statuses: ['SUBMITTED', 'PENDING_REVIEW', 'DOCUMENTS_REQUIRED', 'ACCEPTED', 'REFUSED', 'WAITING_LIST'],
    },
    registrations,
  };
}

export function RegistrationDetailPage(props: { id: string }) {
  const detail = AdminMockAdapter.getRegistrationDetail(props.id);

  return {
    screenId: '0f5e911f59034de4ad8c0c75fc90961b',
    title: `Détail Dossier - ${detail.code} - VISION SCHOOL`,
    registration: detail,
  };
}
