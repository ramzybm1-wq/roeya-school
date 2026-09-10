/**
 * Educational Cycles & Grade Levels Domain Service for VISION SCHOOL.
 * Manages global reference cycles (Préparatoire, Primaire, Moyen, Secondaire)
 * and standardized grade levels (PREP to 3AS).
 */

import { getDb } from '@vision-school/database';
import { cycles, levels, auditLogs, registrations, schoolYearLevels } from '@vision-school/database';
import { eq, and, asc, sql, inArray } from 'drizzle-orm';
import { AppError, User } from '@vision-school/shared';
import { AuthGuard } from '@vision-school/auth';
import { ChoiceService } from './choice.service';

export interface CreateCyclePayload {
  code: string;
  nameFr: string;
  nameAr?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface CreateLevelPayload {
  cycleId: string;
  code: string;
  nameFr: string;
  nameAr?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export class LevelService {
  /**
   * Returns all active educational cycles sorted by display order.
   */
  static async getCycles() {
    const db = getDb();
    return db
      .select()
      .from(cycles)
      .where(eq(cycles.isActive, true))
      .orderBy(asc(cycles.displayOrder));
  }

  /**
   * Returns all cycles (including inactive) for admin management.
   */
  static async getAllCyclesAdmin(actor: User) {
    const db = getDb();
    return db.select().from(cycles).orderBy(asc(cycles.displayOrder));
  }

  /**
   * Creates a new educational cycle.
   */
  static async createCycle(actor: User, payload: CreateCyclePayload) {
    if (!AuthGuard.isSuperAdmin(actor) && !AuthGuard.hasPermission(actor, 'education.manage')) {
      throw new AppError('FORBIDDEN', 'Permission refusée : gestion pédagogique requise.');
    }

    const cleanCode = payload.code.trim().toUpperCase();
    const db = getDb();

    const [existing] = await db.select({ id: cycles.id }).from(cycles).where(eq(cycles.code, cleanCode));
    if (existing) {
      throw new AppError('VALIDATION_ERROR', `Le cycle avec le code ${cleanCode} existe déjà.`);
    }

    const [newCycle] = await db
      .insert(cycles)
      .values({
        code: cleanCode,
        nameFr: payload.nameFr.trim(),
        nameAr: payload.nameAr?.trim() || null,
        displayOrder: payload.displayOrder || 0,
        isActive: payload.isActive !== undefined ? payload.isActive : true,
      })
      .returning();

    return newCycle;
  }

  /**
   * Updates an educational cycle.
   */
  static async updateCycle(actor: User, id: string, payload: Partial<CreateCyclePayload>) {
    if (!AuthGuard.isSuperAdmin(actor) && !AuthGuard.hasPermission(actor, 'education.manage')) {
      throw new AppError('FORBIDDEN', 'Permission refusée.');
    }

    const db = getDb();
    const [updated] = await db
      .update(cycles)
      .set({
        nameFr: payload.nameFr !== undefined ? payload.nameFr.trim() : undefined,
        nameAr: payload.nameAr !== undefined ? payload.nameAr?.trim() || null : undefined,
        displayOrder: payload.displayOrder !== undefined ? payload.displayOrder : undefined,
        isActive: payload.isActive !== undefined ? payload.isActive : undefined,
        updatedAt: new Date(),
      })
      .where(eq(cycles.id, id))
      .returning();

    return updated;
  }

  /**
   * Deactivates or deletes an educational cycle.
   */
  static async deleteCycle(actor: User, id: string) {
    if (!AuthGuard.isSuperAdmin(actor) && !AuthGuard.hasPermission(actor, 'education.delete')) {
      throw new AppError('FORBIDDEN', 'Permission refusée : seul le Super Administrateur peut supprimer un cycle.');
    }

    const db = getDb();
    const [existing] = await db.select().from(cycles).where(eq(cycles.id, id));
    if (!existing) {
      throw new AppError('NOT_FOUND', 'Cycle éducatif introuvable.');
    }

    // Find levels under this cycle
    const childLevels = await db.select({ id: levels.id }).from(levels).where(eq(levels.cycleId, id));
    const levelIds = childLevels.map((l) => l.id);

    if (levelIds.length > 0) {
      // Check historical registrations across all child levels
      const regCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(registrations)
        .where(inArray(registrations.levelId, levelIds));

      if ((regCount[0]?.count || 0) > 0) {
        // Safe deactivation
        const [deactivated] = await db
          .update(cycles)
          .set({ isActive: false, archivedAt: new Date(), updatedAt: new Date() })
          .where(eq(cycles.id, id))
          .returning();

        return {
          id,
          deactivated: true,
          cycle: deactivated,
          message: 'Ce cycle contient des niveaux avec des inscriptions historiques. Il a été désactivé en toute sécurité.',
        };
      }

      // No registrations -> deactivate or remove child school_year_levels and levels
      await db.delete(schoolYearLevels).where(inArray(schoolYearLevels.levelId, levelIds));
      await db.delete(levels).where(inArray(levels.id, levelIds));
    }

    await db.delete(cycles).where(eq(cycles.id, id));
    return { id, deleted: true, message: 'Cycle supprimé avec succès.' };
  }

  /**
   * Returns all active grade levels sorted by display order.
   */
  static async getAllLevels() {
    const db = getDb();
    return db
      .select({
        id: levels.id,
        cycleId: levels.cycleId,
        code: levels.code,
        nameFr: levels.nameFr,
        nameAr: levels.nameAr,
        displayOrder: levels.displayOrder,
        isActive: levels.isActive,
        cycleCode: cycles.code,
        cycleNameFr: cycles.nameFr,
      })
      .from(levels)
      .innerJoin(cycles, eq(levels.cycleId, cycles.id))
      .where(eq(levels.isActive, true))
      .orderBy(asc(levels.displayOrder));
  }

  /**
   * Returns levels for a specific cycle.
   */
  static async getLevelsByCycle(cycleId: string) {
    const db = getDb();
    return db
      .select()
      .from(levels)
      .where(and(eq(levels.cycleId, cycleId), eq(levels.isActive, true)))
      .orderBy(asc(levels.displayOrder));
  }

  /**
   * Creates a new global grade level.
   */
  /**
   * Creates a new global grade level.
   */
  static async createLevel(actor: User, payload: CreateLevelPayload) {
    if (!AuthGuard.isSuperAdmin(actor) && !AuthGuard.hasPermission(actor, 'education.manage')) {
      throw new AppError('FORBIDDEN', 'Permission refusée : gestion pédagogique requise.');
    }

    const cleanCode = payload.code.trim().toUpperCase();
    const db = getDb();

    const [existing] = await db.select({ id: levels.id }).from(levels).where(eq(levels.code, cleanCode));
    if (existing) {
      throw new AppError('VALIDATION_ERROR', `Le niveau avec le code ${cleanCode} existe déjà.`);
    }

    const [newLevel] = await db
      .insert(levels)
      .values({
        cycleId: payload.cycleId,
        code: cleanCode,
        nameFr: payload.nameFr.trim(),
        nameAr: payload.nameAr?.trim() || null,
        displayOrder: payload.displayOrder || 0,
        isActive: payload.isActive !== undefined ? payload.isActive : true,
      })
      .returning();

    return newLevel;
  }

  /**
   * Updates an existing grade level.
   */
  static async updateLevel(actor: User, id: string, payload: Partial<CreateLevelPayload>) {
    if (!AuthGuard.isSuperAdmin(actor) && !AuthGuard.hasPermission(actor, 'education.manage')) {
      throw new AppError('FORBIDDEN', 'Permission refusée.');
    }

    const db = getDb();
    const [updated] = await db
      .update(levels)
      .set({
        nameFr: payload.nameFr !== undefined ? payload.nameFr.trim() : undefined,
        nameAr: payload.nameAr !== undefined ? payload.nameAr?.trim() || null : undefined,
        displayOrder: payload.displayOrder !== undefined ? payload.displayOrder : undefined,
        isActive: payload.isActive !== undefined ? payload.isActive : undefined,
        updatedAt: new Date(),
      })
      .where(eq(levels.id, id))
      .returning();

    return updated;
  }

  /**
   * Deactivates or deletes a level depending on whether registrations or school-year-levels depend on it.
   */
  static async deleteLevel(actor: User, id: string) {
    if (!AuthGuard.isSuperAdmin(actor) && !AuthGuard.hasPermission(actor, 'education.delete') && !AuthGuard.hasPermission(actor, 'school.manage')) {
      throw new AppError('FORBIDDEN', 'Permission refusée : suppression de niveau non autorisée.');
    }

    const db = getDb();
    const [existing] = await db.select().from(levels).where(eq(levels.id, id));
    if (!existing) {
      throw new AppError('NOT_FOUND', 'Niveau scolaire introuvable.');
    }

    // Check historical registrations
    const regCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(registrations)
      .where(eq(registrations.levelId, id));

    if ((regCount[0]?.count || 0) > 0) {
      // Historical registrations exist -> Safe deactivation instead of hard delete
      const [deactivated] = await db
        .update(levels)
        .set({ isActive: false, archivedAt: new Date(), updatedAt: new Date() })
        .where(eq(levels.id, id))
        .returning();

      return {
        id,
        deactivated: true,
        level: deactivated,
        message: 'Ce niveau contient des inscriptions historiques. Il a été désactivé en toute sécurité.',
      };
    }

    // Unused level -> safe to remove associations and delete
    await db.delete(schoolYearLevels).where(eq(schoolYearLevels.levelId, id));
    await db.delete(levels).where(eq(levels.id, id));

    return { id, deleted: true, message: 'Niveau supprimé avec succès.' };
  }

  /**
   * Returns complete educational hierarchy tree (Cycles -> Levels -> Choices)
   */
  static async getCycleTree(includeInactive = false) {
    return ChoiceService.getFullEducationalTree(includeInactive);
  }
}
