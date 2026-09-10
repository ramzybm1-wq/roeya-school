/**
 * Domain types for Student Registrations (Dossiers).
 */

import { RegistrationDocument } from './document';

export type RegistrationStatus =
  | 'NEW'
  | 'UNDER_REVIEW'
  | 'PENDING'
  | 'ACCEPTED'
  | 'REFUSED'
  | 'WAITLISTED'
  | 'CANCELLED'
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PENDING_REVIEW'
  | 'DOCUMENTS_REQUIRED'
  | 'WAITING_LIST';

export type Gender = 'MALE' | 'FEMALE';

export interface StudentInfo {
  firstNameFr: string;
  lastNameFr: string;
  firstNameAr?: string;
  lastNameAr?: string;
  birthDate: string; // ISO Date "YYYY-MM-DD"
  birthPlaceFr: string;
  birthPlaceAr?: string;
  birthWilaya: string;
  gender: Gender;
  nationality: string; // default "Algérienne"
  currentSchool?: string;
  medicalConditionsNotes?: string;
  specialNeedsNotes?: string;
}

export type ParentRelationship = 'FATHER' | 'MOTHER' | 'LEGAL_GUARDIAN';

export interface ParentInfo {
  relationship: ParentRelationship;
  firstNameFr: string;
  lastNameFr: string;
  firstNameAr?: string;
  lastNameAr?: string;
  email: string;
  phonePrimary: string;
  phoneSecondary?: string;
  profession?: string;
  workplace?: string;
  address: string;
  city: string;
  wilaya: string;
  isEmergencyContact: boolean;
}

export interface WaitingListEntry {
  id: string;
  registrationId: string;
  schoolId: string;
  levelId: string;
  academicYearId: string;
  priorityPosition: number;
  addedAt: string;
  promotedAt?: string;
  status: 'PENDING' | 'OFFERED' | 'ACCEPTED' | 'EXPIRED' | 'DECLINED';
  notes?: string;
}

export interface Registration {
  id: string; // Internal stable DB UUID/ID
  code: string; // Public display code, e.g. "REG-2026-000125"
  trackingSecretToken: string; // Safe hash for public tracking validation
  academicYearId: string;
  schoolId: string;
  levelId: string;
  cycleId: string;
  status: RegistrationStatus;
  student: StudentInfo;
  primaryParent: ParentInfo;
  secondaryParent?: ParentInfo;
  documents: RegistrationDocument[];
  adminNotes?: string;
  refusalReason?: string;
  waitingListEntry?: WaitingListEntry;
  submissionDate: string;
  reviewedAt?: string;
  reviewedByUserId?: string;
  acceptedAt?: string;
  refusedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type RegistrationSummary = Pick<
  Registration,
  | 'id'
  | 'code'
  | 'schoolId'
  | 'levelId'
  | 'academicYearId'
  | 'status'
  | 'submissionDate'
  | 'createdAt'
> & {
  studentFullName: string;
  parentFullName: string;
  parentPhone: string;
  parentEmail: string;
};
