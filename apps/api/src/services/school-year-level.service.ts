/**
 * School Year Level Operational Configuration Domain Service for VISION SCHOOL.
 * Manages grade level availability per school and year, public visibility sanitization,
 * registration open/close switches, and tariff associations.
 */

import { getDb } from '@vision-school/database';
import {
  schools,
  academicYears,
  cycles,
  levels,
  schoolYearLevels,
  tariffs,
  auditLogs,
  registrations,
} from '@vision-school/database';
import { eq, and, asc, sql } from 'drizzle-orm';
import { AppError, User } from '@vision-school/shared';
import { AuthGuard } from '@vision-school/auth';
import { CapacityService, DerivedOperationalState } from './capacity.service';
import { AcademicYearService } from './academic-year.service';
import { ChoiceService, ChoiceTreeNode } from './choice.service';

export interface CreateSchoolYearLevelPayload {
  schoolId: string;
  academicYearId: string;
  levelId: string;
  choiceId?: string | null;
  isVisibleClient?: boolean;
  registrationOpen?: boolean;
  registrationOpenAt?: Date | string;
  registrationCloseAt?: Date | string;
  capacityMode?: 'LIMITED' | 'UNLIMITED';
  capacityMax?: number | null;
  fullBehavior?: 'WAITLIST' | 'CLOSE' | 'RECEIVE_WITHOUT_ACCEPTANCE';
  waitingListEnabled?: boolean;
  waitingListMax?: number | null;
  showRemainingPlaces?: boolean;
  showStatusClient?: boolean;
  showFillRate?: boolean;
  nearFullThreshold?: number;
  displayOrder?: number;
}

export interface PublicLevelDto {
  schoolYearLevelId: string;
  levelId: string;
  levelCode: string;
  levelNameFr: string;
  levelNameAr: string | null;
  cycleCode: string;
  cycleNameFr: string;
  cycleNameAr: string | null;
  operationalState: DerivedOperationalState;
  isRegistrationOpen: boolean;
  isWaitlistAvailable: boolean;
  remainingPlaces?: number | null;
  fillRate?: number | null;
  tariff?: {
    isAvailable: boolean;
    amount?: number | null;
    currency?: string;
    displayText?: string;
  };
  choices?: ChoiceTreeNode[];
}

export class SchoolYearLevelService {
  /**
   * Returns sanitized public levels for an establishment during an academic year.
   * Strips hidden capacity numbers, hidden fill rates, and hidden tariffs.
   */
  static async getPublicSchoolLevels(schoolId: string, academicYearIdParam?: string): Promise<PublicLevelDto[]> {
    const db = getDb();

    // 1. Validate school is active
    const [school] = await db
      .select({ id: schools.id, isActive: schools.isActive, status: schools.status })
      .from(schools)
      .where(eq(schools.id, schoolId));

    if (!school || !school.isActive || school.status !== 'ACTIVE') {
      throw new AppError('NOT_FOUND', 'Établissement introuvable ou fermé aux inscriptions.');
    }

    // 2. Resolve academic year (default to current active year if omitted)
    let academicYearId = academicYearIdParam;
    if (!academicYearId) {
      const activeYear = await AcademicYearService.getActiveAcademicYear();
      academicYearId = activeYear.id;
    }

    // 3. Query school_year_levels with level and cycle joins
    const rows = await db
      .select({
        syl: schoolYearLevels,
        level: levels,
        cycle: cycles,
      })
      .from(schoolYearLevels)
      .innerJoin(levels, eq(schoolYearLevels.levelId, levels.id))
      .innerJoin(cycles, eq(levels.cycleId, cycles.id))
      .where(
        and(
          eq(schoolYearLevels.schoolId, schoolId),
          eq(schoolYearLevels.academicYearId, academicYearId),
          eq(schoolYearLevels.isVisibleClient, true),
          eq(levels.isActive, true),
          eq(cycles.isActive, true)
        )
      )
      .orderBy(asc(schoolYearLevels.displayOrder), asc(levels.displayOrder));

    const publicLevels: PublicLevelDto[] = [];

    for (const row of rows) {
      const syl = row.syl;
      const capacitySummary = await CapacityService.getCapacitySummary(syl.id);

      // Fetch active tariff if configured
      const [tariff] = await db
        .select()
        .from(tariffs)
        .where(and(eq(tariffs.schoolYearLevelId, syl.id), eq(tariffs.status, 'ACTIVE')));

      // Build tariff public presentation with privacy rules
      let tariffData: PublicLevelDto['tariff'] = undefined;
      if (tariff) {
        if (tariff.showClient) {
          tariffData = {
            isAvailable: true,
            amount: tariff.amount,
            currency: tariff.currency,
            displayText: `${tariff.amount.toLocaleString('fr-FR')} ${tariff.currency}`,
          };
        } else {
          tariffData = {
            isAvailable: true,
            amount: null, // Zero numeric leakage
            currency: tariff.currency,
            displayText: tariff.hiddenClientMessageFr || 'Tarif sur demande',
          };
        }
      } else {
        tariffData = {
          isAvailable: false,
          displayText: 'Tarif non communiqué',
        };
      }

      const choices = await ChoiceService.getChoicesByLevel(row.level.id);

      publicLevels.push({
        schoolYearLevelId: syl.id,
        levelId: row.level.id,
        levelCode: row.level.code,
        levelNameFr: row.level.nameFr,
        levelNameAr: row.level.nameAr,
        cycleCode: row.cycle.code,
        cycleNameFr: row.cycle.nameFr,
        cycleNameAr: row.cycle.nameAr,
        operationalState: capacitySummary.operationalState,
        isRegistrationOpen: capacitySummary.operationalState === 'OPEN' || capacitySummary.operationalState === 'NEAR_FULL',
        isWaitlistAvailable: capacitySummary.operationalState === 'FULL_WAITLIST',
        remainingPlaces: syl.showRemainingPlaces ? capacitySummary.remainingPlaces : null,
        fillRate: syl.showFillRate ? capacitySummary.fillRate : null,
        tariff: tariffData,
        choices: choices.length > 0 ? choices : undefined,
      });
    }

    return publicLevels;
  }

  /**
   * Returns all school-year level configurations for administrative management with filters.
   */
  static async getSchoolYearLevelsAdmin(
    actor: User,
    filters?: {
      schoolId?: string;
      academicYearId?: string;
      cycleId?: string;
      registrationOpen?: boolean;
    }
  ) {
    if (!AuthGuard.hasPermission(actor, 'capacity.read')) {
      throw new AppError('FORBIDDEN', 'Permission refusée.');
    }

    const db = getDb();
    let query = db
      .select({
        syl: schoolYearLevels,
        level: levels,
        cycle: cycles,
        school: schools,
        academicYear: academicYears,
      })
      .from(schoolYearLevels)
      .innerJoin(levels, eq(schoolYearLevels.levelId, levels.id))
      .innerJoin(cycles, eq(levels.cycleId, cycles.id))
      .innerJoin(schools, eq(schoolYearLevels.schoolId, schools.id))
      .innerJoin(academicYears, eq(schoolYearLevels.academicYearId, academicYears.id));

    const rows = await query;

    let filtered = rows;

    // School scoping for non-superadmin
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
    if (filters?.cycleId) {
      filtered = filtered.filter((r) => r.level.cycleId === filters.cycleId);
    }
    if (filters?.registrationOpen !== undefined) {
      filtered = filtered.filter((r) => r.syl.registrationOpen === filters.registrationOpen);
    }

    const results = await Promise.all(
      filtered.map(async (r) => {
        const capacity = await CapacityService.getCapacitySummary(r.syl.id);
        const [tariff] = await db
          .select()
          .from(tariffs)
          .where(and(eq(tariffs.schoolYearLevelId, r.syl.id), eq(tariffs.status, 'ACTIVE')));

        return {
          id: r.syl.id,
          schoolId: r.syl.schoolId,
          schoolName: r.school.name,
          academicYearId: r.syl.academicYearId,
          academicYearName: r.academicYear.name,
          levelId: r.syl.levelId,
          levelCode: r.level.code,
          levelNameFr: r.level.nameFr,
          cycleId: r.level.cycleId,
          cycleCode: r.cycle.code,
          cycleNameFr: r.cycle.nameFr,
          registrationOpen: r.syl.registrationOpen,
          registrationOpenAt: r.syl.registrationOpenAt,
          registrationCloseAt: r.syl.registrationCloseAt,
          isVisibleClient: r.syl.isVisibleClient,
          showRemainingPlaces: r.syl.showRemainingPlaces,
          showStatusClient: r.syl.showStatusClient,
          showFillRate: r.syl.showFillRate,
          nearFullThreshold: r.syl.nearFullThreshold,
          displayOrder: r.syl.displayOrder,
          capacity,
          tariff: tariff
            ? {
                id: tariff.id,
                amount: tariff.amount,
                currency: tariff.currency,
                showClient: tariff.showClient,
              }
            : null,
        };
      })
    );

    return results;
  }

  /**
   * Creates a school-year level configuration with unique composite validation.
   */
  static async createSchoolYearLevel(actor: User, payload: CreateSchoolYearLevelPayload) {
    if (!AuthGuard.hasPermission(actor, 'capacity.manage')) {
      throw new AppError('FORBIDDEN', 'Permission refusée.');
    }

    if (!AuthGuard.canAccessSchool(actor, payload.schoolId)) {
      throw new AppError('FORBIDDEN', 'Accès refusé pour cet établissement.');
    }

    const db = getDb();

    // Check unique composite (school_id + academic_year_id + level_id)
    const [existing] = await db
      .select({ id: schoolYearLevels.id })
      .from(schoolYearLevels)
      .where(
        and(
          eq(schoolYearLevels.schoolId, payload.schoolId),
          eq(schoolYearLevels.academicYearId, payload.academicYearId),
          eq(schoolYearLevels.levelId, payload.levelId)
        )
      );

    if (existing) {
      throw new AppError('VALIDATION_ERROR', 'Ce niveau existe déjà pour cet établissement et cette année scolaire.');
    }

    const [newSyl] = await db
      .insert(schoolYearLevels)
      .values({
        schoolId: payload.schoolId,
        academicYearId: payload.academicYearId,
        levelId: payload.levelId,
        isVisibleClient: payload.isVisibleClient !== undefined ? payload.isVisibleClient : true,
        registrationOpen: payload.registrationOpen !== undefined ? payload.registrationOpen : false,
        registrationOpenAt: payload.registrationOpenAt ? new Date(payload.registrationOpenAt) : null,
        registrationCloseAt: payload.registrationCloseAt ? new Date(payload.registrationCloseAt) : null,
        capacityMode: payload.capacityMode || 'LIMITED',
        capacityMax: payload.capacityMax !== undefined ? payload.capacityMax : 200,
        fullBehavior: payload.fullBehavior || 'WAITLIST',
        waitingListEnabled: payload.waitingListEnabled !== undefined ? payload.waitingListEnabled : true,
        waitingListMax: payload.waitingListMax || null,
        showRemainingPlaces: payload.showRemainingPlaces || false,
        showStatusClient: payload.showStatusClient !== undefined ? payload.showStatusClient : true,
        showFillRate: payload.showFillRate || false,
        nearFullThreshold: payload.nearFullThreshold || 85,
        displayOrder: payload.displayOrder || 0,
      })
      .returning();

    await db.insert(auditLogs).values({
      userId: actor.id,
      action: 'SCHOOL_YEAR_LEVEL_CREATED',
      module: 'CAPACITIES',
      entityType: 'SCHOOL_YEAR_LEVEL',
      entityId: newSyl.id,
      schoolId: payload.schoolId,
      afterJson: payload,
      result: 'SUCCESS',
    });

    return newSyl;
  }

  /**
   * Opens registration for a school-year level.
   */
  static async openRegistration(actor: User, id: string) {
    if (!AuthGuard.hasPermission(actor, 'capacity.manage')) {
      throw new AppError('FORBIDDEN', 'Permission refusée.');
    }

    const db = getDb();
    const [existing] = await db.select().from(schoolYearLevels).where(eq(schoolYearLevels.id, id));
    if (!existing) throw new AppError('NOT_FOUND', 'Configuration introuvable.');

    if (!AuthGuard.canAccessSchool(actor, existing.schoolId)) {
      throw new AppError('FORBIDDEN', 'Accès refusé pour cet établissement.');
    }

    const [updated] = await db
      .update(schoolYearLevels)
      .set({ registrationOpen: true, updatedAt: new Date() })
      .where(eq(schoolYearLevels.id, id))
      .returning();

    await db.insert(auditLogs).values({
      userId: actor.id,
      action: 'REGISTRATION_OPENED',
      module: 'CAPACITIES',
      entityType: 'SCHOOL_YEAR_LEVEL',
      entityId: id,
      schoolId: existing.schoolId,
      afterJson: { registrationOpen: true },
      result: 'SUCCESS',
    });

    return updated;
  }

  /**
   * Closes registration for a school-year level.
   */
  static async closeRegistration(actor: User, id: string) {
    if (!AuthGuard.hasPermission(actor, 'capacity.manage')) {
      throw new AppError('FORBIDDEN', 'Permission refusée.');
    }

    const db = getDb();
    const [existing] = await db.select().from(schoolYearLevels).where(eq(schoolYearLevels.id, id));
    if (!existing) throw new AppError('NOT_FOUND', 'Configuration introuvable.');

    if (!AuthGuard.canAccessSchool(actor, existing.schoolId)) {
      throw new AppError('FORBIDDEN', 'Accès refusé pour cet établissement.');
    }

    const [updated] = await db
      .update(schoolYearLevels)
      .set({ registrationOpen: false, updatedAt: new Date() })
      .where(eq(schoolYearLevels.id, id))
      .returning();

    await db.insert(auditLogs).values({
      userId: actor.id,
      action: 'REGISTRATION_CLOSED',
      module: 'CAPACITIES',
      entityType: 'SCHOOL_YEAR_LEVEL',
      entityId: id,
      schoolId: existing.schoolId,
      afterJson: { registrationOpen: false },
      result: 'SUCCESS',
    });

    return updated;
  }

  /**
   * Updates an existing school-year level configuration.
   */
  static async updateSchoolYearLevel(actor: User, id: string, payload: Partial<CreateSchoolYearLevelPayload>) {
    if (!AuthGuard.hasPermission(actor, 'capacity.manage')) {
      throw new AppError('FORBIDDEN', 'Permission refusée.');
    }

    const db = getDb();
    const [existing] = await db.select().from(schoolYearLevels).where(eq(schoolYearLevels.id, id));
    if (!existing) throw new AppError('NOT_FOUND', 'Configuration introuvable.');

    if (!AuthGuard.canAccessSchool(actor, existing.schoolId)) {
      throw new AppError('FORBIDDEN', 'Accès refusé pour cet établissement.');
    }

    const updateValues: any = { updatedAt: new Date() };
    if (payload.isVisibleClient !== undefined) updateValues.isVisibleClient = payload.isVisibleClient;
    if (payload.registrationOpen !== undefined) updateValues.registrationOpen = payload.registrationOpen;
    if (payload.registrationOpenAt !== undefined) updateValues.registrationOpenAt = payload.registrationOpenAt ? new Date(payload.registrationOpenAt) : null;
    if (payload.registrationCloseAt !== undefined) updateValues.registrationCloseAt = payload.registrationCloseAt ? new Date(payload.registrationCloseAt) : null;
    if (payload.capacityMode !== undefined) updateValues.capacityMode = payload.capacityMode;
    if (payload.capacityMax !== undefined) updateValues.capacityMax = payload.capacityMax;
    if (payload.fullBehavior !== undefined) updateValues.fullBehavior = payload.fullBehavior;
    if (payload.waitingListEnabled !== undefined) updateValues.waitingListEnabled = payload.waitingListEnabled;
    if (payload.waitingListMax !== undefined) updateValues.waitingListMax = payload.waitingListMax;
    if (payload.showRemainingPlaces !== undefined) updateValues.showRemainingPlaces = payload.showRemainingPlaces;
    if (payload.showStatusClient !== undefined) updateValues.showStatusClient = payload.showStatusClient;
    if (payload.showFillRate !== undefined) updateValues.showFillRate = payload.showFillRate;
    if (payload.nearFullThreshold !== undefined) updateValues.nearFullThreshold = payload.nearFullThreshold;
    if (payload.displayOrder !== undefined) updateValues.displayOrder = payload.displayOrder;

    const [updated] = await db
      .update(schoolYearLevels)
      .set(updateValues)
      .where(eq(schoolYearLevels.id, id))
      .returning();

    await db.insert(auditLogs).values({
      userId: actor.id,
      action: 'SCHOOL_YEAR_LEVEL_UPDATED',
      module: 'CAPACITIES',
      entityType: 'SCHOOL_YEAR_LEVEL',
      entityId: id,
      schoolId: existing.schoolId,
      beforeJson: existing,
      afterJson: updateValues,
      result: 'SUCCESS',
    });

    return updated;
  }

  /**
   * Deactivates or removes a school-year level configuration depending on historical registrations.
   */
  static async deleteSchoolYearLevel(actor: User, id: string) {
    if (!AuthGuard.hasPermission(actor, 'capacity.manage')) {
      throw new AppError('FORBIDDEN', 'Permission refusée.');
    }

    const db = getDb();
    const [existing] = await db.select().from(schoolYearLevels).where(eq(schoolYearLevels.id, id));
    if (!existing) throw new AppError('NOT_FOUND', 'Configuration introuvable.');

    if (!AuthGuard.canAccessSchool(actor, existing.schoolId)) {
      throw new AppError('FORBIDDEN', 'Accès refusé pour cet établissement.');
    }

    // Check if registrations exist for this school-year level
    const regCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(registrations)
      .where(eq(registrations.schoolYearLevelId, id));

    if ((regCount[0]?.count || 0) > 0) {
      // Historical registrations exist -> Safe close / deactivation
      const [updated] = await db
        .update(schoolYearLevels)
        .set({
          registrationOpen: false,
          isVisibleClient: false,
          updatedAt: new Date(),
        })
        .where(eq(schoolYearLevels.id, id))
        .returning();

      return {
        id,
        deactivated: true,
        schoolYearLevel: updated,
        message: 'Ce niveau contient des inscriptions historiques. Il a été désactivé et fermé aux inscriptions.',
      };
    }

    // Clean up tariffs and delete
    await db.delete(tariffs).where(eq(tariffs.schoolYearLevelId, id));
    await db.delete(schoolYearLevels).where(eq(schoolYearLevels.id, id));

    return { id, deleted: true, message: 'Configuration de niveau supprimée avec succès.' };
  }
}
