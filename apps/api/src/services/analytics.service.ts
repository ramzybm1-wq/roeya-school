/**
 * Analytics and Dashboard Metrics Service.
 */

import { AdminMockAdapter, DashboardMetrics } from '@vision-school/ui-shared';

export class AnalyticsService {
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    return AdminMockAdapter.getDashboardMetrics();
  }
}
