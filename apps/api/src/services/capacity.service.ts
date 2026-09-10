/**
 * Capacity Calculation & Quota Management Domain Service for VISION SCHOOL.
 * Single source of truth for dynamic capacity math, fill rate derivations,
 * and capacity-lowering validation rules.
 */

import { getDb } from '@vision-school/database';
import { registrations, schoolYearLevels, auditLogs } from '@vision-school/database';
import { eq, and, sql } from 'drizzle-orm';
import { AppError, User } from '@vision-school/shared';
import { AuthGuard } from '@vision-school/auth';

export type CapacityAlertLevel = 'NORMAL' | 'NEAR_FULL' | 'FULL';
export type DerivedOperationalState = 'OPEN' | 'NEAR_FULL' | 'FULL_WAITLIST' | 'FULL' | 'CLOSED' | 'NOT_STARTED';

export interface CapacitySummary {
  schoolYearLevelId: string;
  capacityMode: 'LIMITED' | 'UNLIMITED';
  capacityMax: number | null;
  acceptedCount: number;
  remainingPlaces: number | null;
  fillRate: number | null; // percentage 0-100
  alertLevel: CapacityAlertLevel;
  operationalState: DerivedOperationalState;
  registrationOpen: boolean;
  waitingListEnabled: boolean;
  waitingListMax: number | null;
  nearFullThreshold: number;
}

export interface UpdateCapacityPayload {
  capacityMode?: 'LIMITED' | 'UNLIMITED';
  capacityMax?: number | null;
  fullBehavior?: 'WAITLIST' | 'CLOSE' | 'RECEIVE_WITHOUT_ACCEPTANCE';
  waitingListEnabled?: boolean;
  waitingListMax?: number | null;
  nearFullThreshold?: number;
}

export class CapacityService {
  /**
   * Computes the exact accepted registrations count for a specific school_year_level.
   * Only registrations with status = 'ACCEPTED' consume capacity.
   */
  static async getAcceptedCount(schoolYearLevelId: string): Promise<number> {
    const db = getDb();
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(registrations)
      .where(
        and(
          eq(registrations.schoolYearLevelId, schoolYearLevelId),
          eq(registrations.status, 'ACCEPTED')
        )
      );

    return Number(result[0]?.count || 0);
  }

  /**
   * Calculates comprehensive capacity summary and derives operational state.
   */
  static async getCapacitySummary(schoolYearLevelId: string): Promise<CapacitySummary> {
    const db = getDb();
    const [syl] = await db
      .select()
      .from(schoolYearLevels)
      .where(eq(schoolYearLevels.id, schoolYearLevelId));

    if (!syl) {
      throw new AppError('NOT_FOUND', 'Configuration de niveau introuvable.');
    }

    const acceptedCount = await this.getAcceptedCount(schoolYearLevelId);
    const nearFullThreshold = syl.nearFullThreshold ?? 85;

    let remainingPlaces: number | null = null;
    let fillRate: number | null = null;
    let alertLevel: CapacityAlertLevel = 'NORMAL';

    if (syl.capacityMode === 'LIMITED') {
      const max = syl.capacityMax ?? 0;
      remainingPlaces = Math.max(0, max - acceptedCount);

      if (max > 0) {
        fillRate = Math.round((acceptedCount / max) * 10000) / 100; // 2 decimal precision
      } else {
        fillRate = acceptedCount > 0 ? 100 : 0;
      }

      if (acceptedCount >= max) {
        alertLevel = 'FULL';
      } else if (fillRate >= nearFullThreshold) {
        alertLevel = 'NEAR_FULL';
      } else {
        alertLevel = 'NORMAL';
      }
    }

    // Derive operational state considering schedule and manual switches
    const now = new Date();
    let operationalState: DerivedOperationalState = 'OPEN';

    if (!syl.registrationOpen) {
      operationalState = 'CLOSED';
    } else if (syl.registrationOpenAt && new Date(syl.registrationOpenAt) > now) {
      operationalState = 'NOT_STARTED';
    } else if (syl.registrationCloseAt && new Date(syl.registrationCloseAt) < now) {
      operationalState = 'CLOSED';
    } else if (syl.capacityMode === 'LIMITED' && syl.capacityMax !== null && acceptedCount >= syl.capacityMax) {
      if (syl.fullBehavior === 'WAITLIST' && syl.waitingListEnabled) {
        operationalState = 'FULL_WAITLIST';
      } else if (syl.fullBehavior === 'CLOSE') {
        operationalState = 'FULL';
      } else {
        operationalState = 'OPEN'; // RECEIVE_WITHOUT_ACCEPTANCE
      }
    } else if (alertLevel === 'NEAR_FULL') {
      operationalState = 'NEAR_FULL';
    } else {
      operationalState = 'OPEN';
    }

    return {
      schoolYearLevelId: syl.id,
      capacityMode: syl.capacityMode,
      capacityMax: syl.capacityMax,
      acceptedCount,
      remainingPlaces,
      fillRate,
      alertLevel,
      operationalState,
      registrationOpen: syl.registrationOpen,
      waitingListEnabled: syl.waitingListEnabled,
      waitingListMax: syl.waitingListMax,
      nearFullThreshold,
    };
  }

  /**
   * Updates capacity quotas with validation preventing reduction below currently accepted students.
   */
  static async updateCapacity(actor: User, schoolYearLevelId: string, payload: UpdateCapacityPayload) {
    if (!AuthGuard.hasPermission(actor, 'capacity.manage')) {
      throw new AppError('FORBIDDEN', 'Permission refusée pour modifier les quotas de capacité.');
    }

    const db = getDb();
    const [existing] = await db
      .select()
      .from(schoolYearLevels)
      .where(eq(schoolYearLevels.id, schoolYearLevelId));

    if (!existing) {
      throw new AppError('NOT_FOUND', 'Configuration de niveau introuvable.');
    }

    if (!AuthGuard.canAccessSchool(actor, existing.schoolId)) {
      throw new AppError('FORBIDDEN', 'Accès refusé pour cet établissement.');
    }

    const acceptedCount = await this.getAcceptedCount(schoolYearLevelId);
    const targetMode = payload.capacityMode || existing.capacityMode;
    const targetMax = payload.capacityMax !== undefined ? payload.capacityMax : existing.capacityMax;

    if (targetMode === 'LIMITED') {
      if (targetMax === null || targetMax === undefined || targetMax < 0) {
        throw new AppError('VALIDATION_ERROR', 'Une capacité maximale positive est obligatoire en mode limité.');
      }

      // CRITICAL RULE: Cannot lower capacity below already accepted registrations
      if (targetMax < acceptedCount) {
        throw new AppError(
          'VALIDATION_ERROR',
          `Impossible de définir une capacité de ${targetMax} place(s) car ${acceptedCount} élève(s) ont déjà été acceptés définitivement.`
        );
      }
    }

    const [updated] = await db
      .update(schoolYearLevels)
      .set({
        capacityMode: targetMode,
        capacityMax: targetMode === 'LIMITED' ? targetMax : null,
        fullBehavior: payload.fullBehavior !== undefined ? payload.fullBehavior : existing.fullBehavior,
        waitingListEnabled: payload.waitingListEnabled !== undefined ? payload.waitingListEnabled : existing.waitingListEnabled,
        waitingListMax: payload.waitingListMax !== undefined ? payload.waitingListMax : existing.waitingListMax,
        nearFullThreshold: payload.nearFullThreshold !== undefined ? payload.nearFullThreshold : existing.nearFullThreshold,
        updatedAt: new Date(),
      })
      .where(eq(schoolYearLevels.id, schoolYearLevelId))
      .returning();

    await db.insert(auditLogs).values({
      userId: actor.id,
      action: 'CAPACITY_UPDATED',
      module: 'CAPACITIES',
      entityType: 'SCHOOL_YEAR_LEVEL',
      entityId: schoolYearLevelId,
      schoolId: existing.schoolId,
      beforeJson: { capacityMode: existing.capacityMode, capacityMax: existing.capacityMax },
      afterJson: { capacityMode: targetMode, capacityMax: targetMax, acceptedCount },
      result: 'SUCCESS',
    });

    return this.getCapacitySummary(schoolYearLevelId);
  }
}
