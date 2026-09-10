/**
 * Admin Dashboard Page - Stitch Screen 'da85e455ea564964b26c290b61673c3e'.
 * Connects to live operational metrics and notifications.
 */

import { DashboardMetrics } from '@vision-school/shared';

export interface DashboardPageProps {
  metrics?: DashboardMetrics;
  recentRegistrations?: any[];
  notifications?: any[];
}

export function DashboardPage(props?: DashboardPageProps) {
  const metrics = props?.metrics || {
    activeSchoolsCount: 2,
    activeLevelsCount: 14,
    openLevelsCount: 3,
    fullLevelsCount: 0,
    totalConfiguredCapacity: 555,
    totalAcceptedRegistrations: 0,
    totalRemainingPlaces: 555,
    activeAcademicYearName: '2026 / 2027',
  };

  return {
    screenId: 'da85e455ea564964b26c290b61673c3e',
    title: 'Tableau de bord Principal - VISION SCHOOL',
    metrics,
    recentRegistrations: props?.recentRegistrations || [],
    notifications: props?.notifications || [],
  };
}
