/**
 * Domain types for Academic Years.
 */

export type AcademicYearStatus = 'UPCOMING' | 'ACTIVE' | 'ARCHIVED';

export interface AcademicYear {
  id: string;
  code: string; // e.g., "2026/2027"
  label: string; // e.g., "Année Scolaire 2026-2027"
  startDate: string; // ISO Date "2026-09-01"
  endDate: string; // ISO Date "2027-06-30"
  registrationStartDate: string; // ISO Date
  registrationEndDate: string; // ISO Date
  status: AcademicYearStatus;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AcademicYearSummary = Pick<
  AcademicYear,
  'id' | 'code' | 'label' | 'status' | 'isCurrent' | 'startDate' | 'endDate'
>;
