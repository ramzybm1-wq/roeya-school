/**
 * Academic Year Domain Service for VISION SCHOOL.
 * Manages academic year lifecycle, atomic activation, closure, archiving,
 * and next-year preparation with conflict previews.
 */

import { getDb, TransactionRunner } from '@vision-school/database';
import {
  academicYears,
  schoolYearLevels,
  tariffs,
  auditLogs,
} from '@vision-school/database';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { AppError, User } from '@vision-school/shared';
import { AuthGuard } from '@vision-school/auth';

export interface CreateAcademicYearPayload {
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  status?: 'DRAFT' | 'PREPARING' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
  isActiveDefault?: boolean;
}

export interface PrepareNextYearOptions {
  copyTariffs?: boolean;
}

export interface PrepareNextYearPreview {
  sourceYearName: string;
  destYearName: string;
  totalLevelsToCopy: number;
  totalCapacitiesToCopy: number;
  totalTariffsToCopy: number;
  conflictingLevelCount: number;
  conflicts: Array<{ schoolId: string; levelId: string; levelCode?: string }>;
}

export class AcademicYearService {
  /**
   * Returns the single currently active/default academic year.
   * Consumed dynamically by client and admin applications (no hardcoding).
   */
  static async getActiveAcademicYear() {
    const db = getDb();
    const [year] = await db
      .select()
      .from(academicYears)
      .where(
        and(
          eq(academicYears.isActiveDefault, true),
          eq(academicYears.status, 'ACTIVE'),
          isNull(academicYears.archivedAt)
        )
      );

    if (!year) {
      throw new AppError('NOT_FOUND', 'Aucune année scolaire active n’est configurée.');
    }

    return year;
  }

  /**
   * Returns all academic years for administrative management.
   */
  static async getAllAcademicYears(actor?: User) {
    const db = getDb();
    return db
      .select()
      .from(academicYears)
      .orderBy(desc(academicYears.startDate));
  }

  /**
   * Returns single academic year by ID.
   */
  static async getYearById(id: string) {
    const db = getDb();
    const [year] = await db.select().from(academicYears).where(eq(academicYears.id, id));
    if (!year) {
      throw new AppError('NOT_FOUND', 'Année scolaire introuvable.');
    }
    return year;
  }

  /**
   * Creates a new academic year.
   */
  static async createAcademicYear(actor: User, payload: CreateAcademicYearPayload) {
    if (!AuthGuard.hasPermission(actor, 'year.manage')) {
      throw new AppError('FORBIDDEN', 'Permission refusée pour gérer les années scolaires.');
    }

    if (!payload.name || !payload.startDate || !payload.endDate) {
      throw new AppError('VALIDATION_ERROR', 'Le libellé, la date de début et la date de fin sont obligatoires.');
    }

    if (new Date(payload.startDate) >= new Date(payload.endDate)) {
      throw new AppError('VALIDATION_ERROR', 'La date de début doit être strictement antérieure à la date de fin.');
    }

    const db = getDb();
    const cleanName = payload.name.trim();

    // Check unique name
    const [existing] = await db.select({ id: academicYears.id }).from(academicYears).where(eq(academicYears.name, cleanName));
    if (existing) {
      throw new AppError('VALIDATION_ERROR', `Une année scolaire nommée "${cleanName}" existe déjà.`);
    }

    const [newYear] = await db
      .insert(academicYears)
      .values({
        name: cleanName,
        startDate: payload.startDate,
        endDate: payload.endDate,
        status: payload.status || 'DRAFT',
        isActiveDefault: payload.isActiveDefault || false,
      })
      .returning();

    await db.insert(auditLogs).values({
      userId: actor.id,
      action: 'ACADEMIC_YEAR_CREATED',
      module: 'ACADEMIC_YEARS',
      entityType: 'ACADEMIC_YEAR',
      entityId: newYear.id,
      afterJson: { name: cleanName, startDate: payload.startDate, endDate: payload.endDate },
      result: 'SUCCESS',
    });

    return newYear;
  }

  /**
   * Atomically activates an academic year as the single platform default.
   */
  static async activateAcademicYear(actor: User, id: string) {
    if (!AuthGuard.hasPermission(actor, 'year.manage')) {
      throw new AppError('FORBIDDEN', 'Permission refusée.');
    }

    const db = getDb();
    const [targetYear] = await db.select().from(academicYears).where(eq(academicYears.id, id));
    if (!targetYear) {
      throw new AppError('NOT_FOUND', 'Année scolaire introuvable.');
    }
    if (targetYear.status === 'ARCHIVED') {
      throw new AppError('VALIDATION_ERROR', 'Impossible d’activer une année scolaire archivée.');
    }

    await TransactionRunner.run(async (tx) => {
      // 1. Deactivate current default
      await tx
        .update(academicYears)
        .set({ isActiveDefault: false })
        .where(eq(academicYears.isActiveDefault, true));

      // 2. Mark target year active and default
      await tx
        .update(academicYears)
        .set({
          isActiveDefault: true,
          status: 'ACTIVE',
          updatedAt: new Date(),
        })
        .where(eq(academicYears.id, id));

      await tx.insert(auditLogs).values({
        userId: actor.id,
        action: 'ACADEMIC_YEAR_ACTIVATED',
        module: 'ACADEMIC_YEARS',
        entityType: 'ACADEMIC_YEAR',
        entityId: id,
        afterJson: { name: targetYear.name, status: 'ACTIVE', isActiveDefault: true },
        result: 'SUCCESS',
      });
    });

    return this.getYearById(id);
  }

  /**
   * Closes an academic year (no new registrations).
   */
  static async closeAcademicYear(actor: User, id: string) {
    if (!AuthGuard.hasPermission(actor, 'year.manage')) {
      throw new AppError('FORBIDDEN', 'Permission refusée.');
    }

    const db = getDb();
    const [year] = await db.select().from(academicYears).where(eq(academicYears.id, id));
    if (!year) throw new AppError('NOT_FOUND', 'Année scolaire introuvable.');

    const [updated] = await db
      .update(academicYears)
      .set({
        status: 'CLOSED',
        isActiveDefault: false,
        updatedAt: new Date(),
      })
      .where(eq(academicYears.id, id))
      .returning();

    await db.insert(auditLogs).values({
      userId: actor.id,
      action: 'ACADEMIC_YEAR_CLOSED',
      module: 'ACADEMIC_YEARS',
      entityType: 'ACADEMIC_YEAR',
      entityId: id,
      afterJson: { status: 'CLOSED' },
      result: 'SUCCESS',
    });

    return updated;
  }

  /**
   * Archives an academic year (read-only historical).
   */
  static async archiveAcademicYear(actor: User, id: string) {
    if (!AuthGuard.hasPermission(actor, 'year.manage')) {
      throw new AppError('FORBIDDEN', 'Permission refusée.');
    }

    const db = getDb();
    const [updated] = await db
      .update(academicYears)
      .set({
        status: 'ARCHIVED',
        isActiveDefault: false,
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(academicYears.id, id))
      .returning();

    await db.insert(auditLogs).values({
      userId: actor.id,
      action: 'ACADEMIC_YEAR_ARCHIVED',
      module: 'ACADEMIC_YEARS',
      entityType: 'ACADEMIC_YEAR',
      entityId: id,
      afterJson: { status: 'ARCHIVED' },
      result: 'SUCCESS',
    });

    return updated;
  }

  /**
   * Previews configuration copying from source year to destination year.
   */
  static async previewPrepareNextYear(
    actor: User,
    sourceYearId: string,
    destYearId: string
  ): Promise<PrepareNextYearPreview> {
    if (!AuthGuard.hasPermission(actor, 'year.manage')) {
      throw new AppError('FORBIDDEN', 'Permission refusée.');
    }

    const db = getDb();
    const [sourceYear] = await db.select().from(academicYears).where(eq(academicYears.id, sourceYearId));
    const [destYear] = await db.select().from(academicYears).where(eq(academicYears.id, destYearId));

    if (!sourceYear || !destYear) {
      throw new AppError('NOT_FOUND', 'Année source ou destination introuvable.');
    }

    const sourceLevels = await db
      .select()
      .from(schoolYearLevels)
      .where(eq(schoolYearLevels.academicYearId, sourceYearId));

    const destLevels = await db
      .select()
      .from(schoolYearLevels)
      .where(eq(schoolYearLevels.academicYearId, destYearId));

    const conflicts: Array<{ schoolId: string; levelId: string }> = [];
    for (const sl of sourceLevels) {
      const existsInDest = destLevels.some(
        (dl) => dl.schoolId === sl.schoolId && dl.levelId === sl.levelId
      );
      if (existsInDest) {
        conflicts.push({ schoolId: sl.schoolId, levelId: sl.levelId });
      }
    }

    let tariffCount = 0;
    for (const sl of sourceLevels) {
      const [t] = await db.select().from(tariffs).where(eq(tariffs.schoolYearLevelId, sl.id));
      if (t) tariffCount++;
    }

    return {
      sourceYearName: sourceYear.name,
      destYearName: destYear.name,
      totalLevelsToCopy: sourceLevels.length,
      totalCapacitiesToCopy: sourceLevels.filter((s) => s.capacityMax !== null).length,
      totalTariffsToCopy: tariffCount,
      conflictingLevelCount: conflicts.length,
      conflicts,
    };
  }

  /**
   * Copies school-year levels, capacities, and tariffs to a destination year.
   * NEVER copies registrations, students, or documents.
   */
  static async prepareNextYear(
    actor: User,
    sourceYearId: string,
    destYearId: string,
    options: PrepareNextYearOptions = { copyTariffs: true }
  ): Promise<{ copiedLevels: number; copiedTariffs: number }> {
    if (!AuthGuard.hasPermission(actor, 'year.manage')) {
      throw new AppError('FORBIDDEN', 'Permission refusée.');
    }

    const preview = await this.previewPrepareNextYear(actor, sourceYearId, destYearId);
    if (preview.conflictingLevelCount > 0) {
      throw new AppError(
        'VALIDATION_ERROR',
        `L’année de destination contient déjà ${preview.conflictingLevelCount} niveau(x) configuré(s). Veuillez résoudre les conflits avant de copier.`
      );
    }

    const db = getDb();
    let copiedLevels = 0;
    let copiedTariffs = 0;

    await TransactionRunner.run(async (tx) => {
      const sourceLevels = await tx
        .select()
        .from(schoolYearLevels)
        .where(eq(schoolYearLevels.academicYearId, sourceYearId));

      for (const sl of sourceLevels) {
        const [insertedLevel] = await tx
          .insert(schoolYearLevels)
          .values({
            schoolId: sl.schoolId,
            academicYearId: destYearId,
            levelId: sl.levelId,
            isVisibleClient: sl.isVisibleClient,
            registrationStatus: 'NEW',
            registrationOpen: false, // Default closed until Admin opens
            capacityMode: sl.capacityMode,
            capacityMax: sl.capacityMax,
            fullBehavior: sl.fullBehavior,
            waitingListEnabled: sl.waitingListEnabled,
            waitingListMax: sl.waitingListMax,
            showRemainingPlaces: sl.showRemainingPlaces,
            showStatusClient: sl.showStatusClient,
            showFillRate: sl.showFillRate,
            nearFullThreshold: sl.nearFullThreshold,
            displayOrder: sl.displayOrder,
          })
          .returning();

        copiedLevels++;

        if (options.copyTariffs) {
          const [sourceTariff] = await tx
            .select()
            .from(tariffs)
            .where(and(eq(tariffs.schoolYearLevelId, sl.id), eq(tariffs.status, 'ACTIVE')));

          if (sourceTariff) {
            await tx.insert(tariffs).values({
              schoolYearLevelId: insertedLevel.id,
              amount: sourceTariff.amount,
              currency: sourceTariff.currency,
              showClient: sourceTariff.showClient,
              hiddenClientMessageFr: sourceTariff.hiddenClientMessageFr,
              hiddenClientMessageAr: sourceTariff.hiddenClientMessageAr,
              status: 'ACTIVE',
              createdBy: actor.id,
            });
            copiedTariffs++;
          }
        }
      }

      await tx.insert(auditLogs).values({
        userId: actor.id,
        action: 'ACADEMIC_YEAR_CONFIG_COPIED',
        module: 'ACADEMIC_YEARS',
        entityType: 'ACADEMIC_YEAR',
        entityId: destYearId,
        afterJson: { sourceYearId, destYearId, copiedLevels, copiedTariffs },
        result: 'SUCCESS',
      });
    });

    return { copiedLevels, copiedTariffs };
  }
}
