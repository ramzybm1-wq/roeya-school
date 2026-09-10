/**
 * Educational Progression Transitions Service.
 * Manages authorized progressions between levels and choices (e.g. 1AS Sciences -> 2AS Mathématiques / Sciences Expérimentales).
 */

import { getDb } from '@vision-school/database';
import {
  educationTransitions,
  levels,
  levelChoices,
} from '@vision-school/database';
import { eq, and, sql, isNull } from 'drizzle-orm';
import { AppError, User } from '@vision-school/shared';
import { AuthGuard } from '@vision-school/auth';

export interface CreateTransitionPayload {
  fromLevelId: string;
  fromChoiceId?: string | null;
  toLevelId: string;
  toChoiceId?: string | null;
  isActive?: boolean;
  notes?: string | null;
}

export class TransitionService {
  /**
   * Returns all transitions, optionally filtered by origin/destination level.
   */
  static async getTransitions(filters?: { fromLevelId?: string; toLevelId?: string }) {
    const db = getDb();

    // Query transitions joined with level and choice data
    const query = db
      .select({
        id: educationTransitions.id,
        fromLevelId: educationTransitions.fromLevelId,
        fromChoiceId: educationTransitions.fromChoiceId,
        toLevelId: educationTransitions.toLevelId,
        toChoiceId: educationTransitions.toChoiceId,
        isActive: educationTransitions.isActive,
        notes: educationTransitions.notes,
        createdAt: educationTransitions.createdAt,
        updatedAt: educationTransitions.updatedAt,
      })
      .from(educationTransitions);

    const conditions = [];
    if (filters?.fromLevelId) {
      conditions.push(eq(educationTransitions.fromLevelId, filters.fromLevelId));
    }
    if (filters?.toLevelId) {
      conditions.push(eq(educationTransitions.toLevelId, filters.toLevelId));
    }

    const transitions = conditions.length > 0
      ? await query.where(and(...conditions))
      : await query;

    // Enrich with names
    const allLevels = await db.select({ id: levels.id, code: levels.code, nameFr: levels.nameFr }).from(levels);
    const levelMap = new Map(allLevels.map((l) => [l.id, l]));

    const allChoices = await db.select({ id: levelChoices.id, code: levelChoices.code, nameFr: levelChoices.nameFr }).from(levelChoices);
    const choiceMap = new Map(allChoices.map((c) => [c.id, c]));

    return transitions.map((t) => ({
      ...t,
      fromLevel: levelMap.get(t.fromLevelId) || null,
      fromChoice: t.fromChoiceId ? choiceMap.get(t.fromChoiceId) || null : null,
      toLevel: levelMap.get(t.toLevelId) || null,
      toChoice: t.toChoiceId ? choiceMap.get(t.toChoiceId) || null : null,
    }));
  }

  /**
   * Creates a new educational transition rule.
   */
  static async createTransition(actor: User, payload: CreateTransitionPayload) {
    if (!AuthGuard.isSuperAdmin(actor) && !AuthGuard.hasPermission(actor, 'education.manage')) {
      throw AppError.forbidden('Permission refusée : gestion des transitions requise.');
    }

    const db = getDb();

    // Verify from and to levels exist
    const [fromLevel] = await db.select().from(levels).where(eq(levels.id, payload.fromLevelId));
    if (!fromLevel) throw AppError.notFound('Niveau d\'origine introuvable.');

    const [toLevel] = await db.select().from(levels).where(eq(levels.id, payload.toLevelId));
    if (!toLevel) throw AppError.notFound('Niveau de destination introuvable.');

    // Check duplicate rule
    const existing = await db
      .select({ id: educationTransitions.id })
      .from(educationTransitions)
      .where(
        and(
          eq(educationTransitions.fromLevelId, payload.fromLevelId),
          payload.fromChoiceId
            ? eq(educationTransitions.fromChoiceId, payload.fromChoiceId)
            : isNull(educationTransitions.fromChoiceId),
          eq(educationTransitions.toLevelId, payload.toLevelId),
          payload.toChoiceId
            ? eq(educationTransitions.toChoiceId, payload.toChoiceId)
            : isNull(educationTransitions.toChoiceId)
        )
      );

    if (existing.length > 0) {
      throw AppError.badRequest('Cette règle de transition existe déjà.');
    }

    const [newTransition] = await db
      .insert(educationTransitions)
      .values({
        fromLevelId: payload.fromLevelId,
        fromChoiceId: payload.fromChoiceId || null,
        toLevelId: payload.toLevelId,
        toChoiceId: payload.toChoiceId || null,
        isActive: payload.isActive !== undefined ? payload.isActive : true,
        notes: payload.notes?.trim() || null,
      })
      .returning();

    return newTransition;
  }

  /**
   * Deletes an educational transition rule.
   */
  static async deleteTransition(actor: User, id: string) {
    if (!AuthGuard.isSuperAdmin(actor) && !AuthGuard.hasPermission(actor, 'education.manage')) {
      throw AppError.forbidden('Permission refusée.');
    }

    const db = getDb();
    const [existing] = await db.select().from(educationTransitions).where(eq(educationTransitions.id, id));
    if (!existing) {
      throw AppError.notFound('Règle de transition introuvable.');
    }

    await db.delete(educationTransitions).where(eq(educationTransitions.id, id));
    return { id, deleted: true, message: 'Règle de transition supprimée avec succès.' };
  }

  /**
   * Validates whether a student can transition from a previous level/choice to a target level/choice.
   * Permissive design: if no rules are configured for the previous level, transition is accepted.
   */
  static async validateProgression(
    fromLevelId: string,
    fromChoiceId: string | null | undefined,
    toLevelId: string,
    toChoiceId: string | null | undefined
  ): Promise<{ valid: boolean; reason?: string }> {
    const db = getDb();

    // Find any rules configured for this origin
    const originRules = await db
      .select()
      .from(educationTransitions)
      .where(
        and(
          eq(educationTransitions.fromLevelId, fromLevelId),
          eq(educationTransitions.isActive, true),
          fromChoiceId
            ? eq(educationTransitions.fromChoiceId, fromChoiceId)
            : isNull(educationTransitions.fromChoiceId)
        )
      );

    // If no rules exist at all for this origin, allow (permissive mode)
    if (originRules.length === 0) {
      return { valid: true };
    }

    // Check if target matches any active rule
    const match = originRules.some(
      (r) =>
        r.toLevelId === toLevelId &&
        (r.toChoiceId === (toChoiceId || null) || (!r.toChoiceId && !toChoiceId))
    );

    if (!match) {
      return {
        valid: false,
        reason: 'Cette orientation / transition n\'est pas autorisée selon les règles de progression pédagogique configurées.',
      };
    }

    return { valid: true };
  }
}
