/**
 * Audit Log Domain Service.
 */

import { AuditEvent } from '@vision-school/shared';
import { AdminMockAdapter } from '@vision-school/ui-shared';

export class AuditService {
  private auditLogs: AuditEvent[] = AdminMockAdapter.getAuditEvents();

  async getRecentAuditLogs(limit = 50): Promise<AuditEvent[]> {
    return this.auditLogs.slice(0, limit);
  }
}
