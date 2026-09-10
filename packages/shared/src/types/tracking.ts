/**
 * Domain types for Public Registration Tracking (Safe Data Only).
 * Never leaks admin notes, private internal IDs, or unauthorized personal info.
 */

import { RegistrationStatus } from './registration';

export interface PublicTrackingResponse {
  code: string; // "REG-2026-000125"
  status: RegistrationStatus;
  submissionDate: string;
  studentInitials: string; // e.g. "A. B." for privacy
  schoolNameFr: string;
  schoolNameAr: string;
  levelNameFr: string;
  levelNameAr: string;
  academicYearLabel: string;
  statusLabelFr: string;
  statusLabelAr: string;
  statusDescriptionFr: string;
  statusDescriptionAr: string;
  pendingActions?: {
    documentsRequired?: string[];
    interviewScheduledDate?: string;
  };
  updatedAt: string;
}

export interface PublicTimelineEvent {
  date: string;
  status: string;
  titleFr: string;
  titleAr?: string | null;
  descriptionFr?: string | null;
}

export interface PublicDocumentItem {
  documentTypeId: string;
  nameFr: string;
  status: string;
  statusLabelFr: string;
  isRequired: boolean;
  actionAllowed: 'ADD' | 'REPLACE' | 'NONE';
  publicReplacementMessage?: string | null;
}

export interface PublicDossierResponse {
  registrationCode: string;
  submissionDate: string;
  status: string;
  statusLabelFr: string;
  statusLabelAr?: string;
  statusMessageFr: string;
  statusMessageAr?: string;
  student: {
    fullNameFr: string;
    fullNameAr?: string | null;
    birthDate: string;
  };
  school: {
    name: string;
    address: string;
    phone: string | null;
    email: string | null;
    gpsCoordinates?: string | null;
  };
  level: {
    nameFr: string;
    nameAr?: string | null;
  };
  academicYear: {
    name: string;
  };
  timeline: PublicTimelineEvent[];
  documents: PublicDocumentItem[];
  waitingList?: {
    isWaitlisted: boolean;
    position?: number | null;
    status?: string;
    statusLabelFr?: string;
    statusLabelAr?: string;
    offerStatus?: string | null;
    offerExpiresAt?: string | null;
    messageFr?: string;
    messageAr?: string;
  } | null;
  tariff?: {
    amount: number;
    currency: string;
  } | null;
}
