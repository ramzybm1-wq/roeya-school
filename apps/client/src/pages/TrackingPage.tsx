/**
 * Registration Tracking Page - Stitch Screen '6c96a78c804a44f9b90e34841a0221f9'.
 * Handles registration code + parent phone verification, status timeline,
 * waiting list status, document replacement actions, and school contact buttons.
 */

import { PublicDossierResponse } from '@vision-school/shared';

export interface TrackingPageProps {
  searchedCode?: string;
  searchedPhone?: string;
  isLoading?: boolean;
  errorMessage?: string | null;
  dossier?: PublicDossierResponse | null;
  isSessionExpired?: boolean;
}

export function TrackingPage(props?: TrackingPageProps) {
  return {
    screenId: '6c96a78c804a44f9b90e34841a0221f9',
    title: 'Suivi de demande - VISION SCHOOL',
    searchedCode: props?.searchedCode || '',
    searchedPhone: props?.searchedPhone || '',
    isLoading: props?.isLoading || false,
    errorMessage: props?.errorMessage || null,
    isSessionExpired: props?.isSessionExpired || false,
    dossier: props?.dossier || null,
  };
}
