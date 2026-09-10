/**
 * Domain types for Capacity Management and Seat Quotas.
 */

export type CapacityAlertLevel = 'NORMAL' | 'NEAR_CAPACITY' | 'FULL' | 'OVER_CAPACITY';

export interface LevelCapacity {
  id: string;
  schoolId: string;
  levelId: string;
  academicYearId: string;
  totalSeats: number;
  acceptedSeats: number;
  pendingReviewSeats: number;
  reservedSeats: number;
  availableSeats: number;
  waitingListCount: number;
  nearCapacityThresholdPercent: number; // e.g. 85%
  isLocked: boolean;
  alertLevel: CapacityAlertLevel;
  updatedAt: string;
}

export interface CapacityUpdatePayload {
  totalSeats: number;
  reservedSeats?: number;
  nearCapacityThresholdPercent?: number;
  isLocked?: boolean;
}
