/**
 * Educational Choices (Filières, Spécialités, Sous-options) Domain Service.
 * Manages arbitrary-depth educational branching per grade level.
 */

import { getDb } from '@vision-school/database';
import {
  cycles,
  levels,
  levelChoices,
  registrations,
  schoolYearLevels,
} from '@vision-school/database';
import { eq, and, asc, sql, isNull, inArray } from 'drizzle-orm';
import { AppError, User } from '@vision-school/shared';
import { AuthGuard } from '@vision-school/auth';

export interface CreateChoicePayload {
  levelId: string;
  parentId?: string | null;
  code: string;
  nameFr: string;
  nameAr?: string | null;
  description?: string | null;
  nodeType?: string; // 'CHOICE' | 'SUB_CHOICE' | 'SPECIALITY' | 'OPTION'
  displayOrder?: number;
  isActive?: boolean;
}

export interface UpdateChoicePayload {
  nameFr?: string;
  nameAr?: string | null;
  description?: string | null;
  nodeType?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface ChoiceTreeNode {
  id: string;
  levelId: string;
  parentId: string | null;
  code: string;
  nameFr: string;
  nameAr: string | null;
  description: string | null;
  nodeType: string;
  displayOrder: number;
  isActive: boolean;
  children: ChoiceTreeNode[];
}

export interface LevelTreeNode {
  id: string;
  cycleId: string;
  code: string;
  nameFr: string;
  nameAr: string | null;
  displayOrder: number;
  isActive: boolean;
  choices: ChoiceTreeNode[];
}

export interface CycleTreeNode {
  id: string;
  code: string;
  nameFr: string;
  nameAr: string | null;
  displayOrder: number;
  isActive: boolean;
  levels: LevelTreeNode[];
}

export class ChoiceService {
  /**
   * Returns a hierarchical tree of choices for a given grade level.
   */
  static async getChoicesByLevel(levelId: string, includeInactive = false): Promise<ChoiceTreeNode[]> {
    const db = getDb();
    const query = db
      .select()
      .from(levelChoices)
      .where(
        includeInactive
          ? eq(levelChoices.levelId, levelId)
          : and(eq(levelChoices.levelId, levelId), eq(levelChoices.isActive, true), isNull(levelChoices.archivedAt))
      )
      .orderBy(asc(levelChoices.displayOrder), asc(levelChoices.nameFr));

    const flatList = await query;
    return this.buildChoiceTree(flatList);
  }

  /**
   * Returns a flat list of choices for a given grade level.
   */
  static async getFlatChoicesByLevel(levelId: string, includeInactive = false) {
    const db = getDb();
    return db
      .select()
      .from(levelChoices)
      .where(
        includeInactive
          ? eq(levelChoices.levelId, levelId)
          : and(eq(levelChoices.levelId, levelId), eq(levelChoices.isActive, true), isNull(levelChoices.archivedAt))
      )
      .orderBy(asc(levelChoices.displayOrder), asc(levelChoices.nameFr));
  }

  /**
   * Returns a single choice by ID.
   */
  static async getChoiceById(id: string) {
    const db = getDb();
    const [choice] = await db.select().from(levelChoices).where(eq(levelChoices.id, id));
    if (!choice) {
      throw AppError.notFound('Choix / filière introuvable.');
    }
    return choice;
  }

  /**
   * Creates a new choice / sub-choice under a level.
   */
  static async createChoice(actor: User, payload: CreateChoicePayload) {
    if (!AuthGuard.isSuperAdmin(actor) && !AuthGuard.hasPermission(actor, 'education.manage')) {
      throw AppError.forbidden('Permission refusée : gestion pédagogique requise.');
    }

    const cleanCode = payload.code.trim().toUpperCase();
    const db = getDb();

    // 1. Verify level exists
    const [targetLevel] = await db.select().from(levels).where(eq(levels.id, payload.levelId));
    if (!targetLevel) {
      throw AppError.notFound('Niveau scolaire introuvable.');
    }

    // 2. If parentId provided, verify parent exists and belongs to same level
    if (payload.parentId) {
      const [parentChoice] = await db.select().from(levelChoices).where(eq(levelChoices.id, payload.parentId));
      if (!parentChoice) {
        throw AppError.badRequest('Choix parent introuvable.');
      }
      if (parentChoice.levelId !== payload.levelId) {
        throw AppError.badRequest('Le choix parent doit appartenir au même niveau scolaire.');
      }
    }

    // 3. Verify unique code
    const [existing] = await db.select({ id: levelChoices.id }).from(levelChoices).where(eq(levelChoices.code, cleanCode));
    if (existing) {
      throw AppError.badRequest(`Un choix avec le code "${cleanCode}" existe déjà.`);
    }

    // 4. Insert
    const [newChoice] = await db
      .insert(levelChoices)
      .values({
        levelId: payload.levelId,
        parentId: payload.parentId || null,
        code: cleanCode,
        nameFr: payload.nameFr.trim(),
        nameAr: payload.nameAr?.trim() || null,
        description: payload.description?.trim() || null,
        nodeType: payload.nodeType || (payload.parentId ? 'SUB_CHOICE' : 'CHOICE'),
        displayOrder: payload.displayOrder !== undefined ? payload.displayOrder : 0,
        isActive: payload.isActive !== undefined ? payload.isActive : true,
      })
      .returning();

    return newChoice;
  }

  /**
   * Updates an existing choice / sub-choice.
   */
  static async updateChoice(actor: User, id: string, payload: UpdateChoicePayload) {
    if (!AuthGuard.isSuperAdmin(actor) && !AuthGuard.hasPermission(actor, 'education.manage')) {
      throw AppError.forbidden('Permission refusée.');
    }

    const db = getDb();
    const [existing] = await db.select().from(levelChoices).where(eq(levelChoices.id, id));
    if (!existing) {
      throw AppError.notFound('Choix introuvable.');
    }

    const [updated] = await db
      .update(levelChoices)
      .set({
        nameFr: payload.nameFr !== undefined ? payload.nameFr.trim() : undefined,
        nameAr: payload.nameAr !== undefined ? payload.nameAr?.trim() || null : undefined,
        description: payload.description !== undefined ? payload.description?.trim() || null : undefined,
        nodeType: payload.nodeType !== undefined ? payload.nodeType : undefined,
        displayOrder: payload.displayOrder !== undefined ? payload.displayOrder : undefined,
        isActive: payload.isActive !== undefined ? payload.isActive : undefined,
        updatedAt: new Date(),
      })
      .where(eq(levelChoices.id, id))
      .returning();

    return updated;
  }

  /**
   * Deactivates or hard deletes a choice.
   */
  static async deleteChoice(actor: User, id: string) {
    if (!AuthGuard.isSuperAdmin(actor) && !AuthGuard.hasPermission(actor, 'education.delete')) {
      throw AppError.forbidden('Permission refusée : seul le Super Administrateur ou un utilisateur autorisé peut supprimer un choix.');
    }

    const db = getDb();
    const [existing] = await db.select().from(levelChoices).where(eq(levelChoices.id, id));
    if (!existing) {
      throw AppError.notFound('Choix introuvable.');
    }

    // Check if any registrations reference this choice
    const regCount = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(registrations)
      .where(eq(registrations.choiceId, id));

    if ((regCount[0]?.count || 0) > 0) {
      // Historical registrations exist -> Safe deactivation
      const [deactivated] = await db
        .update(levelChoices)
        .set({
          isActive: false,
          archivedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(levelChoices.id, id))
        .returning();

      return {
        id,
        deactivated: true,
        choice: deactivated,
        message: 'Ce choix contient des inscriptions historiques. Il a été désactivé en toute sécurité.',
      };
    }

    // Check school_year_levels referencing this choice
    await db.delete(schoolYearLevels).where(eq(schoolYearLevels.choiceId, id));

    // Hard delete (cascades to children via FK ON DELETE CASCADE)
    await db.delete(levelChoices).where(eq(levelChoices.id, id));

    return { id, deleted: true, message: 'Choix supprimé avec succès.' };
  }

  /**
   * Builds the complete nested educational tree: Cycle -> Levels -> Choices (nested recursively).
   */
  static async getFullEducationalTree(includeInactive = false): Promise<CycleTreeNode[]> {
    const db = getDb();

    // 1. Fetch cycles
    const allCycles = await db
      .select()
      .from(cycles)
      .where(includeInactive ? sql`true` : and(eq(cycles.isActive, true), isNull(cycles.archivedAt)))
      .orderBy(asc(cycles.displayOrder));

    // 2. Fetch levels
    const allLevels = await db
      .select()
      .from(levels)
      .where(includeInactive ? sql`true` : and(eq(levels.isActive, true), isNull(levels.archivedAt)))
      .orderBy(asc(levels.displayOrder));

    // 3. Fetch choices
    const allChoices = await db
      .select()
      .from(levelChoices)
      .where(includeInactive ? sql`true` : and(eq(levelChoices.isActive, true), isNull(levelChoices.archivedAt)))
      .orderBy(asc(levelChoices.displayOrder));

    // Group choices by level
    const choicesByLevel = new Map<string, typeof allChoices>();
    for (const c of allChoices) {
      const list = choicesByLevel.get(c.levelId) || [];
      list.push(c);
      choicesByLevel.set(c.levelId, list);
    }

    // Group levels by cycle
    const levelsByCycle = new Map<string, LevelTreeNode[]>();
    for (const l of allLevels) {
      const levelChoicesList = choicesByLevel.get(l.id) || [];
      const choiceTree = this.buildChoiceTree(levelChoicesList);

      const levelNode: LevelTreeNode = {
        id: l.id,
        cycleId: l.cycleId,
        code: l.code,
        nameFr: l.nameFr,
        nameAr: l.nameAr,
        displayOrder: l.displayOrder,
        isActive: l.isActive,
        choices: choiceTree,
      };

      const list = levelsByCycle.get(l.cycleId) || [];
      list.push(levelNode);
      levelsByCycle.set(l.cycleId, list);
    }

    // Build cycle tree
    return allCycles.map((cyc) => ({
      id: cyc.id,
      code: cyc.code,
      nameFr: cyc.nameFr,
      nameAr: cyc.nameAr,
      displayOrder: cyc.displayOrder,
      isActive: cyc.isActive,
      levels: levelsByCycle.get(cyc.id) || [],
    }));
  }

  /**
   * Helper to build a recursive choice tree from a flat list.
   */
  private static buildChoiceTree(flatList: Array<{
    id: string;
    levelId: string;
    parentId: string | null;
    code: string;
    nameFr: string;
    nameAr: string | null;
    description: string | null;
    nodeType: string;
    displayOrder: number;
    isActive: boolean;
  }>): ChoiceTreeNode[] {
    const nodeMap = new Map<string, ChoiceTreeNode>();
    const roots: ChoiceTreeNode[] = [];

    // First pass: create nodes
    for (const item of flatList) {
      nodeMap.set(item.id, {
        id: item.id,
        levelId: item.levelId,
        parentId: item.parentId,
        code: item.code,
        nameFr: item.nameFr,
        nameAr: item.nameAr,
        description: item.description,
        nodeType: item.nodeType,
        displayOrder: item.displayOrder,
        isActive: item.isActive,
        children: [],
      });
    }

    // Second pass: attach to parents or roots
    for (const item of flatList) {
      const node = nodeMap.get(item.id)!;
      if (item.parentId && nodeMap.has(item.parentId)) {
        nodeMap.get(item.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    return roots;
  }
}
