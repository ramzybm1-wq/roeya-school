/**
 * Tariff & Fees Domain Service for VISION SCHOOL.
 * Implements immutable fee versioning, copy-to-school/year with price adjustments,
 * and client visibility sanitization.
 */

import { getDb, TransactionRunner } from '@vision-school/database';
import {
  tariffs,
  schoolYearLevels,
  schools,
  levels,
  academicYears,
  auditLogs,
} from '@vision-school/database';
import { eq, and, desc } from 'drizzle-orm';
import { AppError, User } from '@vision-school/shared';
import { AuthGuard } from '@vision-school/auth';

export interface CreateTariffPayload {
  schoolYearLevelId?: string;
  schoolId?: string;
  levelId?: string;
  amount: number;
  currency?: string;
  showClient?: boolean;
  isPublic?: boolean;
  hiddenClientMessageFr?: string;
  hiddenClientMessageAr?: string;
  validFrom?: Date | string;
  validTo?: Date | string;
}

export interface TariffAdjustment {
  type: 'SAME' | 'PERCENTAGE' | 'FIXED';
  value: number; // e.g. 5 for +5%, 2000 for +2000 DZD
}

export class TariffService {
  /**
   * Returns all tariffs with school-scoped access filters.
   */
  static async getTariffs(
    actor: User,
    filters?: { schoolId?: string; academicYearId?: string; schoolYearLevelId?: string }
  ) {
    if (!AuthGuard.hasPermission(actor, 'tariff.read')) {
      throw AppError.forbidden('Permission refusée pour consulter les tarifs.');
    }

    const db = getDb();
    let query = db
      .select({
        tariff: tariffs,
        syl: schoolYearLevels,
        school: schools,
        level: levels,
        academicYear: academicYears,
      })
      .from(tariffs)
      .innerJoin(schoolYearLevels, eq(tariffs.schoolYearLevelId, schoolYearLevels.id))
      .innerJoin(schools, eq(schoolYearLevels.schoolId, schools.id))
      .innerJoin(levels, eq(schoolYearLevels.levelId, levels.id))
      .innerJoin(academicYears, eq(schoolYearLevels.academicYearId, academicYears.id))
      .where(eq(tariffs.status, 'ACTIVE'))
      .orderBy(desc(tariffs.createdAt));

    const rows = await query;
    let filtered = rows;

    if (actor.role !== 'SUPER_ADMIN') {
      filtered = filtered.filter((r) =>
        actor.allowedSchoolIds && actor.allowedSchoolIds.includes(r.syl.schoolId)
      );
    }

    if (filters?.schoolId) {
      filtered = filtered.filter((r) => r.syl.schoolId === filters.schoolId);
    }
    if (filters?.academicYearId) {
      filtered = filtered.filter((r) => r.syl.academicYearId === filters.academicYearId);
    }
    if (filters?.schoolYearLevelId) {
      filtered = filtered.filter((r) => r.tariff.schoolYearLevelId === filters.schoolYearLevelId);
    }

    return filtered.map((r) => ({
      id: r.tariff.id,
      schoolYearLevelId: r.tariff.schoolYearLevelId,
      schoolId: r.syl.schoolId,
      schoolName: r.school.name,
      academicYearId: r.syl.academicYearId,
      academicYearName: r.academicYear.name,
      levelId: r.syl.levelId,
      levelCode: r.level.code,
      levelNameFr: r.level.nameFr,
      amount: r.tariff.amount,
      currency: r.tariff.currency,
      showClient: r.tariff.showClient,
      hiddenClientMessageFr: r.tariff.hiddenClientMessageFr,
      hiddenClientMessageAr: r.tariff.hiddenClientMessageAr,
      status: r.tariff.status,
      validFrom: r.tariff.validFrom,
      validTo: r.tariff.validTo,
      createdAt: r.tariff.createdAt,
    }));
  }

  /**
   * Creates a new tariff. Closes or deactivates any existing active tariff on the same level.
   */
  static async createTariff(actor: User, payload: CreateTariffPayload) {
    if (!AuthGuard.hasPermission(actor, 'tariff.manage')) {
      throw AppError.forbidden('Permission refusée pour configurer les tarifs.');
    }

    if (payload.amount === undefined || payload.amount < 0) {
      throw AppError.badRequest('Le montant du tarif doit être supérieur ou égal à zéro.');
    }

    const db = getDb();
    let sylId = payload.schoolYearLevelId;
    if (!sylId && payload.schoolId) {
      const [foundSyl] = await db
        .select()
        .from(schoolYearLevels)
        .where(
          payload.levelId
            ? and(eq(schoolYearLevels.schoolId, payload.schoolId), eq(schoolYearLevels.levelId, payload.levelId))
            : eq(schoolYearLevels.schoolId, payload.schoolId)
        )
        .limit(1);
      if (foundSyl) {
        sylId = foundSyl.id;
      }
    }

    if (!sylId) {
      throw AppError.badRequest('schoolYearLevelId ou schoolId valide est requis.');
    }

    const [syl] = await db
      .select()
      .from(schoolYearLevels)
      .where(eq(schoolYearLevels.id, sylId));

    if (!syl) throw AppError.notFound('Configuration de niveau');

    if (!AuthGuard.canAccessSchool(actor, syl.schoolId)) {
      throw AppError.forbidden('Accès refusé pour cet établissement.');
    }

    const now = new Date();
    const shouldShow = payload.showClient !== undefined ? payload.showClient : (payload.isPublic !== undefined ? payload.isPublic : true);

    return TransactionRunner.run(async (tx) => {
      // Close validity of previous active tariff
      await tx
        .update(tariffs)
        .set({ status: 'INACTIVE', validTo: now, updatedAt: now })
        .where(
          and(
            eq(tariffs.schoolYearLevelId, sylId),
            eq(tariffs.status, 'ACTIVE')
          )
        );

      const [newTariff] = await tx
        .insert(tariffs)
        .values({
          schoolYearLevelId: sylId,
          amount: Math.round(payload.amount),
          currency: payload.currency || 'DZD',
          showClient: shouldShow,
          hiddenClientMessageFr: payload.hiddenClientMessageFr?.trim() || null,
          hiddenClientMessageAr: payload.hiddenClientMessageAr?.trim() || null,
          status: 'ACTIVE',
          validFrom: payload.validFrom ? new Date(payload.validFrom) : now,
          validTo: payload.validTo ? new Date(payload.validTo) : null,
          createdBy: actor.id,
        })
        .returning();

      await tx.insert(auditLogs).values({
        userId: actor.id,
        action: 'TARIFF_CREATED',
        module: 'TARIFFS',
        entityType: 'TARIFF',
        entityId: newTariff.id,
        schoolId: syl.schoolId,
        afterJson: { amount: newTariff.amount, showClient: newTariff.showClient },
        result: 'SUCCESS',
      });

      return newTariff;
    });
  }

  /**
   * Versioned update of an existing tariff record.
   * Closes the old version and creates a new active version to preserve history.
   */
  static async updateTariff(
    actor: User,
    id: string,
    payload: Partial<CreateTariffPayload>
  ) {
    if (!AuthGuard.hasPermission(actor, 'tariff.manage')) {
      throw AppError.forbidden('Permission refusée.');
    }

    const db = getDb();
    const [existing] = await db.select().from(tariffs).where(eq(tariffs.id, id));
    if (!existing) throw AppError.notFound('Tarif');

    const [syl] = await db
      .select()
      .from(schoolYearLevels)
      .where(eq(schoolYearLevels.id, existing.schoolYearLevelId));

    if (!AuthGuard.canAccessSchool(actor, syl.schoolId)) {
      throw AppError.forbidden('Accès refusé pour cet établissement.');
    }

    const newAmount = payload.amount !== undefined ? payload.amount : existing.amount;
    if (newAmount < 0) {
      throw AppError.badRequest('Le montant du tarif doit être supérieur ou égal à zéro.');
    }

    const now = new Date();

    return TransactionRunner.run(async (tx) => {
      // Deactivate / close existing
      await tx
        .update(tariffs)
        .set({ status: 'INACTIVE', validTo: now, updatedAt: now })
        .where(eq(tariffs.id, id));

      const [newVersion] = await tx
        .insert(tariffs)
        .values({
          schoolYearLevelId: existing.schoolYearLevelId,
          amount: Math.round(newAmount),
          currency: payload.currency || existing.currency,
          showClient:
            payload.showClient !== undefined
              ? payload.showClient
              : payload.isPublic !== undefined
              ? payload.isPublic
              : existing.showClient,
          hiddenClientMessageFr:
            payload.hiddenClientMessageFr !== undefined
              ? payload.hiddenClientMessageFr
              : existing.hiddenClientMessageFr,
          hiddenClientMessageAr:
            payload.hiddenClientMessageAr !== undefined
              ? payload.hiddenClientMessageAr
              : existing.hiddenClientMessageAr,
          status: 'ACTIVE',
          validFrom: now,
          createdBy: actor.id,
        })
        .returning();

      await tx.insert(auditLogs).values({
        userId: actor.id,
        action: 'TARIFF_VERSIONED',
        module: 'TARIFFS',
        entityType: 'TARIFF',
        entityId: newVersion.id,
        schoolId: syl.schoolId,
        beforeJson: { amount: existing.amount, showClient: existing.showClient },
        afterJson: { amount: newVersion.amount, showClient: newVersion.showClient },
        result: 'SUCCESS',
      });

      return newVersion;
    });
  }

  /**
   * Bulk updates client visibility on selected tariffs.
   */
  static async bulkToggleVisibility(actor: User, tariffIds: string[], showClient: boolean) {
    if (!AuthGuard.hasPermission(actor, 'tariff.manage')) {
      throw AppError.forbidden('Permission refusée.');
    }

    const db = getDb();
    for (const id of tariffIds) {
      await db
        .update(tariffs)
        .set({ showClient, updatedAt: new Date() })
        .where(eq(tariffs.id, id));
    }

    return { updatedCount: tariffIds.length, showClient };
  }

  /**
   * Copies tariffs across academic years with optional percentage or fixed adjustments.
   */
  static async copyTariffsToNextYear(
    actor: User,
    sourceYearId: string,
    destYearId: string,
    adjustment: TariffAdjustment = { type: 'SAME', value: 0 }
  ) {
    if (!AuthGuard.hasPermission(actor, 'tariff.manage')) {
      throw AppError.forbidden('Permission refusée.');
    }

    const db = getDb();

    const sourceTariffRows = await db
      .select({
        tariff: tariffs,
        syl: schoolYearLevels,
      })
      .from(tariffs)
      .innerJoin(schoolYearLevels, eq(tariffs.schoolYearLevelId, schoolYearLevels.id))
      .where(
        and(
          eq(schoolYearLevels.academicYearId, sourceYearId),
          eq(tariffs.status, 'ACTIVE')
        )
      );

    const destSylRows = await db
      .select()
      .from(schoolYearLevels)
      .where(eq(schoolYearLevels.academicYearId, destYearId));

    let copiedCount = 0;

    await TransactionRunner.run(async (tx) => {
      for (const row of sourceTariffRows) {
        // Find matching school + level in destination year
        const matchingDestSyl = destSylRows.find(
          (d) => d.schoolId === row.syl.schoolId && d.levelId === row.syl.levelId
        );

        if (matchingDestSyl) {
          let adjustedAmount = row.tariff.amount;

          if (adjustment.type === 'PERCENTAGE') {
            adjustedAmount = Math.round(row.tariff.amount * (1 + adjustment.value / 100));
          } else if (adjustment.type === 'FIXED') {
            adjustedAmount = Math.max(0, row.tariff.amount + adjustment.value);
          }

          // Check if destination already has an active tariff
          const [existingDestTariff] = await tx
            .select()
            .from(tariffs)
            .where(
              and(
                eq(tariffs.schoolYearLevelId, matchingDestSyl.id),
                eq(tariffs.status, 'ACTIVE')
              )
            );

          if (!existingDestTariff) {
            await tx.insert(tariffs).values({
              schoolYearLevelId: matchingDestSyl.id,
              amount: adjustedAmount,
              currency: row.tariff.currency,
              showClient: row.tariff.showClient,
              hiddenClientMessageFr: row.tariff.hiddenClientMessageFr,
              hiddenClientMessageAr: row.tariff.hiddenClientMessageAr,
              status: 'ACTIVE',
              createdBy: actor.id,
            });
            copiedCount++;
          }
        }
      }
    });

    return { copiedCount, adjustment };
  }

  /**
   * Safely deactivates/archives a tariff record to preserve audit integrity.
   */
  static async deleteTariff(actor: User, id: string) {
    if (!AuthGuard.hasPermission(actor, 'tariff.manage')) {
      throw AppError.forbidden('Permission refusée.');
    }
    const db = getDb();
    const [existing] = await db.select().from(tariffs).where(eq(tariffs.id, id));
    if (!existing) throw AppError.notFound('Tarif');

    const [syl] = await db
      .select()
      .from(schoolYearLevels)
      .where(eq(schoolYearLevels.id, existing.schoolYearLevelId));

    if (syl && !AuthGuard.canAccessSchool(actor, syl.schoolId)) {
      throw AppError.forbidden('Accès refusé pour cet établissement.');
    }

    const now = new Date();
    const [updated] = await db
      .update(tariffs)
      .set({ status: 'INACTIVE', validTo: now, updatedAt: now })
      .where(eq(tariffs.id, id))
      .returning();

    await db.insert(auditLogs).values({
      userId: actor.id,
      action: 'TARIFF_DELETED',
      module: 'TARIFFS',
      entityType: 'TARIFF',
      entityId: id,
      schoolId: syl?.schoolId,
      beforeJson: existing,
      result: 'SUCCESS',
    });

    return { id, deleted: true, message: 'Tarif désactivé et archivé avec succès.' };
  }
}
