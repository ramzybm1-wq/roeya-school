/**
 * Domain types for Admin Dashboard Metrics.
 */

export interface DashboardMetrics {
  // Counts by Status
  totalRegistrations: number;
  newRegistrations: number;
  pendingRegistrations: number;
  acceptedRegistrations: number;
  refusedRegistrations: number;
  waitlistedRegistrations: number;
  cancelledRegistrations: number;

  // Capacity KPIs
  totalConfiguredCapacity: number;
  totalAcceptedRegistrations: number;
  totalRemainingPlaces: number;
  fillRatePercentage: number;

  // Scope & Reference Counts
  activeSchoolsCount: number;
  activeLevelsCount: number;
  openLevelsCount: number;
  fullLevelsCount: number;
  activeAcademicYearName: string;

  // Breakdown & Evolution
  byLevel?: Array<{
    levelId: string;
    levelName: string;
    levelCode: string;
    cycleName: string;
    capacityMax: number;
    acceptedCount: number;
    remainingPlaces: number;
    fillRate: number;
    totalRequests: number;
  }>;
  bySchool?: Array<{
    schoolId: string;
    schoolName: string;
    totalRequests: number;
    acceptedCount: number;
  }>;

  // Operational Alerts
  alerts?: Array<{
    type: 'INFO' | 'WARNING' | 'ALERT';
    title: string;
    description: string;
    count?: number;
    link?: string;
  }>;
}
