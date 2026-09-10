/**
 * Admin Capacities and Audit Routes.
 */

import { AppError, createSuccessResponse } from '@vision-school/shared';
import { LevelCapacityValidator } from '@vision-school/validation';
import { CapacityService } from '../../services/capacity.service';
import { AuditService } from '../../services/audit.service';
import { AuditMiddleware } from '../../middleware/audit.middleware';

export class AdminCapacitiesRouter {
  async list(schoolId: string, academicYearId: string) {
    const capacities = (await (CapacityService as any).getCapacitiesForSchoolAndYear?.(schoolId, academicYearId)) || [];
    return createSuccessResponse(capacities);
  }

  async update(id: string, body: unknown, adminUserId: string) {
    const validation = LevelCapacityValidator.validateCapacityUpdate(body);
    if (!validation.isValid || !validation.data) {
      throw AppError.badRequest('Validation de la capacité échouée.', validation.errors);
    }

    const updated = await (CapacityService as any).updateCapacity(
      id,
      validation.data.totalSeats,
      validation.data.reservedSeats
    );

    AuditMiddleware.record({
      action: 'CAPACITY_UPDATED',
      performedByUserId: adminUserId,
      schoolId: updated?.schoolId,
      targetEntityType: 'CAPACITY',
      targetEntityId: updated?.id || id,
      description: `Capacité modifiée: ${updated?.totalSeats || validation.data.totalSeats} places totales.`,
    });

    return createSuccessResponse(updated);
  }
}

export class AdminAuditRouter {
  constructor(private auditService = new AuditService()) {}

  async list(limit = 50) {
    const logs = await this.auditService.getRecentAuditLogs(limit);
    return createSuccessResponse(logs);
  }
}
