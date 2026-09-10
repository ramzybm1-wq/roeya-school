/**
 * Automatic Audit Logging Middleware.
 */

import { AuditAction, AuditEvent } from '@vision-school/shared';

export interface RecordAuditParams {
  action: AuditAction;
  performedByUserId?: string;
  performedByEmail?: string;
  schoolId?: string;
  targetEntityType: 'REGISTRATION' | 'STUDENT' | 'CAPACITY' | 'TARIFF' | 'DOCUMENT' | 'USER' | 'SCHOOL' | 'MEDIA' | 'SECURITY';
  targetEntityId: string;
  description: string;
  ipAddress?: string;
  metadata?: Record<string, unknown>;
}

export class AuditMiddleware {
  private static auditLogStore: AuditEvent[] = [];

  static record(params: RecordAuditParams): AuditEvent {
    const event: AuditEvent = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      action: params.action,
      performedByUserId: params.performedByUserId,
      performedByEmail: params.performedByEmail,
      schoolId: params.schoolId,
      targetEntityType: params.targetEntityType,
      targetEntityId: params.targetEntityId,
      description: params.description,
      ipAddress: params.ipAddress,
      metadata: params.metadata,
      createdAt: new Date().toISOString(),
    };

    AuditMiddleware.auditLogStore.unshift(event);
    return event;
  }

  static getRecentLogs(limit = 50): AuditEvent[] {
    return AuditMiddleware.auditLogStore.slice(0, limit);
  }
}
