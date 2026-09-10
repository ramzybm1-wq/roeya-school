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
