/**
 * Waiting List Domain Service for VISION SCHOOL.
 * Implements FIFO queue management, dynamic position calculation, capacity-release events,
 * place offers with temporary capacity reservations, skip/reactivate, transfers,
 * and client privacy protection.
 */

import { getDb, TransactionRunner } from '@vision-school/database';
import {
  waitingListEntries,
  registrations,
  schoolYearLevels,
  schools,
  levels,
  students,
  parents,
  capacityReservations,
  registrationStatusHistory,
  auditLogs,
  notifications,
} from '@vision-school/database';
import { eq, and, sql, desc, asc, isNull, inArray, lt } from 'drizzle-orm';
import { AppError, User } from '@vision-school/shared';
import { AuthGuard } from '@vision-school/auth';
import { CapacityService } from './capacity.service';

export interface AddToWaitingListOptions {
  priorityType?: string;
  priorityReason?: string;
  manualPriority?: number;
}

export interface PlaceOfferOptions {
  expiresAt: Date | string;
  reserveCapacity?: boolean;
  notes?: string;
}

export interface SkipCandidateOptions {
  reason: string;
  reviewAt?: Date | string;
}

export interface RemoveFromWaitingListOptions {
  reasonCode: 'PARENT_NOT_INTERESTED' | 'DUPLICATE' | 'WRONG_LEVEL' | 'CANCELLED_BY_PARENT' | 'OTHER';
  comment?: string;
  registrationOutcome?: 'REFUSED' | 'CANCELLED';
}

export interface WaitingListQueueFilters {
  status?: string;
  search?: string;
}

export interface WaitingQueueItem {
  id: string;
  position: number;
  registrationId: string;
  registrationCode: string;
  schoolYearLevelId: string;
  schoolId: string;
  schoolName: string;
  levelId: string;
  levelCode: string;
  levelNameFr: string;
  studentFullName: string;
  studentGender: string;
  parentFullName: string;
  parentPhone: string;
  parentEmail?: string;
  enteredAt: Date;
  status: string;
  priorityType?: string | null;
  manualPriority?: number | null;
  offerStatus?: string | null;
  offerExpiresAt?: Date | null;
  isEligibleForPromotion: boolean;
  skippedAt?: Date | null;
  skipReason?: string | null;
  skipReviewAt?: Date | null;
}

export class WaitingListService {
  /**
   * Adds an eligible registration to the waiting list of a specific school_year_level.
   */
  static async addToWaitingList(
    registrationId: string,
    schoolYearLevelId: string,
    actor?: User,
    options?: AddToWaitingListOptions
  ) {
    const db = getDb();

    // 1. Verify school_year_level configuration & waitlist enablement
    const [syl] = await db
      .select()
      .from(schoolYearLevels)
      .where(eq(schoolYearLevels.id, schoolYearLevelId));

    if (!syl) {
      throw new AppError('NOT_FOUND', 'Configuration de niveau introuvable.');
    }

    if (!syl.waitingListEnabled) {
      throw new AppError('VALIDATION_ERROR', 'La liste d’attente n’est pas activée pour ce niveau.');
    }

    // 2. Verify registration exists
    const [reg] = await db
      .select()
      .from(registrations)
      .where(eq(registrations.id, registrationId));

    if (!reg) {
      throw new AppError('NOT_FOUND', 'Dossier d’inscription introuvable.');
    }

    // 3. Check for existing active waiting list entry (no duplicate active entries)
    const [existingEntry] = await db
      .select()
      .from(waitingListEntries)
      .where(
        and(
          eq(waitingListEntries.registrationId, registrationId),
          eq(waitingListEntries.schoolYearLevelId, schoolYearLevelId),
          inArray(waitingListEntries.status, ['ACTIVE', 'SKIPPED_TEMPORARILY', 'OFFERED'])
        )
      );

    if (existingEntry) {
      throw new AppError('VALIDATION_ERROR', 'Ce dossier est déjà inscrit sur la liste d’attente de ce niveau.');
    }

    // 4. Check maximum waiting list limit if configured
    if (syl.waitingListMax !== null && syl.waitingListMax > 0) {
      const [countRes] = await db
        .select({ count: sql<number>`count(*)` })
        .from(waitingListEntries)
        .where(
          and(
            eq(waitingListEntries.schoolYearLevelId, schoolYearLevelId),
            inArray(waitingListEntries.status, ['ACTIVE', 'SKIPPED_TEMPORARILY', 'OFFERED'])
          )
        );

      const activeCount = Number(countRes?.count || 0);
      if (activeCount >= syl.waitingListMax) {
        throw new AppError('VALIDATION_ERROR', 'La liste d’attente pour ce niveau a atteint sa capacité maximale.');
      }
    }

    const now = new Date();

    return TransactionRunner.run(async (tx) => {
      // Calculate original historical position
      const [posRes] = await tx
        .select({ count: sql<number>`count(*)` })
        .from(waitingListEntries)
        .where(
          and(
            eq(waitingListEntries.schoolYearLevelId, schoolYearLevelId),
            inArray(waitingListEntries.status, ['ACTIVE', 'SKIPPED_TEMPORARILY', 'OFFERED'])
          )
        );
      const originalPosition = Number(posRes?.count || 0) + 1;

      // Insert waiting list entry
      const [newEntry] = await tx
        .insert(waitingListEntries)
        .values({
          registrationId,
          schoolYearLevelId,
          enteredAt: now,
          originalPosition,
          priorityType: options?.priorityType || null,
          priorityReason: options?.priorityReason || null,
          manualPriority: options?.manualPriority || null,
          status: 'ACTIVE',
        })
        .returning();

      // Update registration status to WAITLISTED
      const oldStatus = reg.status;
      await tx
        .update(registrations)
        .set({
          status: 'WAITLISTED',
          waitlistedAt: now,
          updatedAt: now,
        })
        .where(eq(registrations.id, registrationId));

      // Record status history
      await tx.insert(registrationStatusHistory).values({
        registrationId,
        fromStatus: oldStatus as any,
        toStatus: 'WAITLISTED',
        publicComment: 'Inscription sur liste d’attente (capacité atteinte)',
        changedByUserId: actor?.id || null,
      });

      // Record audit log
      await tx.insert(auditLogs).values({
        userId: actor?.id || null,
        action: 'REGISTRATION_WAITLISTED',
        module: 'WAITING_LIST',
        entityType: 'REGISTRATION',
        entityId: registrationId,
        schoolId: syl.schoolId,
        afterJson: options,
        result: 'SUCCESS',
      });

      return {
        entry: newEntry,
        registration: {
          id: registrationId,
          status: 'WAITLISTED',
        },
      };
    });
  }

  /**
   * Retrieves active waiting list queue for a school_year_level with computed ranks.
   */
  static async getQueue(schoolYearLevelId: string, filters?: WaitingListQueueFilters): Promise<WaitingQueueItem[]> {
    const db = getDb();

    // Query joins entries + registration + student + parent
    const query = db
      .select({
        entry: waitingListEntries,
        reg: registrations,
        student: students,
        parent: parents,
        syl: schoolYearLevels,
        school: schools,
        level: levels,
      })
      .from(waitingListEntries)
      .innerJoin(registrations, eq(waitingListEntries.registrationId, registrations.id))
      .innerJoin(students, eq(registrations.studentId, students.id))
      .innerJoin(parents, eq(registrations.parentId, parents.id))
      .innerJoin(schoolYearLevels, eq(waitingListEntries.schoolYearLevelId, schoolYearLevels.id))
      .innerJoin(schools, eq(schoolYearLevels.schoolId, schools.id))
      .innerJoin(levels, eq(schoolYearLevels.levelId, levels.id))
      .where(eq(waitingListEntries.schoolYearLevelId, schoolYearLevelId))
      .orderBy(
        desc(waitingListEntries.manualPriority), // Priority first if configured
        asc(waitingListEntries.enteredAt), // FIFO by server timestamp
        asc(waitingListEntries.id)
      );

    const rows = await query;

    let filtered = rows;
    if (filters?.status) {
      filtered = filtered.filter((r) => r.entry.status === filters.status);
    } else {
      // Default: active queue view
      filtered = filtered.filter((r) =>
        ['ACTIVE', 'SKIPPED_TEMPORARILY', 'OFFERED'].includes(r.entry.status)
      );
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.reg.registrationCode.toLowerCase().includes(q) ||
          (r.student.fullName || r.student.firstName || '').toLowerCase().includes(q) ||
          (r.student.lastName || '').toLowerCase().includes(q) ||
          r.parent.phonePrimary.toLowerCase().includes(q)
      );
    }

    const now = new Date();

    return filtered.map((r, index) => {
      const isSkippedActive =
        r.entry.status === 'SKIPPED_TEMPORARILY' &&
        (!r.entry.skipReviewAt || new Date(r.entry.skipReviewAt) > now);

      const isEligible = r.entry.status === 'ACTIVE' && !isSkippedActive;

      return {
        id: r.entry.id,
        position: index + 1, // Dynamic rank
        registrationId: r.reg.id,
        registrationCode: r.reg.registrationCode,
        schoolYearLevelId: r.entry.schoolYearLevelId,
        schoolId: r.school.id,
        schoolName: r.school.name,
        levelId: r.level.id,
        levelCode: r.level.code,
        levelNameFr: r.level.nameFr,
        studentFullName: r.student.fullName || `${r.student.firstName || ''} ${r.student.lastName || ''}`.trim(),
        studentGender: r.student.gender,
        parentFullName: r.parent.fullName,
        parentPhone: r.parent.phonePrimary,
        parentEmail: r.parent.email || undefined,
        enteredAt: r.entry.enteredAt,
        status: r.entry.status,
        priorityType: r.entry.priorityType,
        manualPriority: r.entry.manualPriority,
        offerStatus: r.entry.offerStatus,
        offerExpiresAt: r.entry.offerExpiresAt,
        isEligibleForPromotion: isEligible,
        skippedAt: r.entry.skippedAt,
        skipReason: r.entry.skipReason,
        skipReviewAt: r.entry.skipReviewAt,
      };
    });
  }

  /**
   * Returns the next recommended candidate (#1 eligible) for a level.
   */
  static async getNextEligibleCandidate(schoolYearLevelId: string): Promise<WaitingQueueItem | null> {
    const queue = await this.getQueue(schoolYearLevelId);
    const eligible = queue.find((item) => item.isEligibleForPromotion);
    return eligible || null;
  }

  /**
   * Promotes a waiting list candidate to ACCEPTED status with transaction-safe capacity validation.
   */
  static async promoteCandidate(actor: User, entryId: string) {
    if (!AuthGuard.hasPermission(actor, 'waitinglist.manage')) {
      throw AppError.forbidden('Permission refusée pour gérer la liste d’attente.');
    }

    const db = getDb();
    const [entry] = await db
      .select({
        entry: waitingListEntries,
        syl: schoolYearLevels,
        reg: registrations,
      })
      .from(waitingListEntries)
      .innerJoin(schoolYearLevels, eq(waitingListEntries.schoolYearLevelId, schoolYearLevels.id))
      .innerJoin(registrations, eq(waitingListEntries.registrationId, registrations.id))
      .where(eq(waitingListEntries.id, entryId));

    if (!entry) {
      throw AppError.notFound('Entrée sur liste d’attente introuvable.');
    }

    if (!AuthGuard.canAccessSchool(actor, entry.syl.schoolId)) {
      throw AppError.forbidden('Accès refusé pour cet établissement.');
    }

    if (!['ACTIVE', 'OFFERED', 'SKIPPED_TEMPORARILY'].includes(entry.entry.status)) {
      throw AppError.badRequest(`Impossible de promouvoir un dossier au statut ${entry.entry.status}.`);
    }

    const now = new Date();

    return TransactionRunner.run(async (tx) => {
      // 1. Concurrency safe capacity check
      const [acceptedCountRes] = await tx
        .select({ count: sql<number>`count(*)` })
        .from(registrations)
        .where(
          and(
            eq(registrations.schoolYearLevelId, entry.syl.id),
            eq(registrations.status, 'ACCEPTED')
          )
        );

      const acceptedCount = Number(acceptedCountRes?.count || 0);

      if (entry.syl.capacityMode === 'LIMITED' && entry.syl.capacityMax !== null) {
        if (acceptedCount >= entry.syl.capacityMax) {
          throw AppError.badRequest('Aucune place disponible : la capacité maximale est déjà atteinte.');
        }
      }

      // 2. Mark waiting entry PROMOTED
      const [promotedEntry] = await tx
        .update(waitingListEntries)
        .set({
          status: 'PROMOTED',
          acceptedFromWaitlistAt: now,
          updatedAt: now,
        })
        .where(eq(waitingListEntries.id, entryId))
        .returning();

      // 3. Update registration to ACCEPTED
      const [updatedReg] = await tx
        .update(registrations)
        .set({
          status: 'ACCEPTED',
          acceptedAt: now,
          updatedAt: now,
        })
        .where(eq(registrations.id, entry.reg.id))
        .returning();

      // 4. Consume any active capacity reservation
      await tx
        .update(capacityReservations)
        .set({
          status: 'CONSUMED',
          updatedAt: now,
        })
        .where(
          and(
            eq(capacityReservations.waitingListEntryId, entryId),
            eq(capacityReservations.status, 'ACTIVE')
          )
        );

      // 5. Record status history
      await tx.insert(registrationStatusHistory).values({
        registrationId: entry.reg.id,
        fromStatus: entry.reg.status,
        toStatus: 'ACCEPTED',
        publicComment: 'Promotion depuis la liste d’attente',
        changedByUserId: actor.id,
      });

      // 6. Record audit log
      await tx.insert(auditLogs).values({
        userId: actor.id,
        action: 'WAITLIST_PROMOTED',
        module: 'WAITING_LIST',
        entityType: 'WAITING_LIST_ENTRY',
        entityId: entryId,
        schoolId: entry.syl.schoolId,
        afterJson: { registrationId: entry.reg.id, code: entry.reg.registrationCode },
        result: 'SUCCESS',
      });

      return {
        entry: promotedEntry,
        registration: updatedReg,
      };
    });
  }

  /**
   * Creates a formal place offer with an optional temporary capacity reservation.
   */
  static async createPlaceOffer(actor: User, entryId: string, options: PlaceOfferOptions) {
    if (!AuthGuard.hasPermission(actor, 'waitinglist.manage')) {
      throw AppError.forbidden('Permission refusée.');
    }

    const db = getDb();
    const [entry] = await db
      .select({
        entry: waitingListEntries,
        syl: schoolYearLevels,
        reg: registrations,
      })
      .from(waitingListEntries)
      .innerJoin(schoolYearLevels, eq(waitingListEntries.schoolYearLevelId, schoolYearLevels.id))
      .innerJoin(registrations, eq(waitingListEntries.registrationId, registrations.id))
      .where(eq(waitingListEntries.id, entryId));

    if (!entry) throw AppError.notFound('Entrée introuvable.');

    if (!AuthGuard.canAccessSchool(actor, entry.syl.schoolId)) {
      throw AppError.forbidden('Accès refusé pour cet établissement.');
    }

    const expiresAtDate = new Date(options.expiresAt);
    if (expiresAtDate <= new Date()) {
      throw AppError.badRequest('La date d’expiration de l’offre doit être dans le futur.');
    }

    const now = new Date();
    const shouldReserve = options.reserveCapacity !== undefined ? options.reserveCapacity : true;

    return TransactionRunner.run(async (tx) => {
      if (shouldReserve && entry.syl.capacityMode === 'LIMITED' && entry.syl.capacityMax !== null) {
        // Count accepted registrations
        const [acceptedRes] = await tx
          .select({ count: sql<number>`count(*)` })
          .from(registrations)
          .where(
            and(
              eq(registrations.schoolYearLevelId, entry.syl.id),
              eq(registrations.status, 'ACCEPTED')
            )
          );

        // Count active reservations
        const [activeReservationsRes] = await tx
          .select({ count: sql<number>`count(*)` })
          .from(capacityReservations)
          .where(
            and(
              eq(capacityReservations.schoolYearLevelId, entry.syl.id),
              eq(capacityReservations.status, 'ACTIVE')
            )
          );

        const accepted = Number(acceptedRes?.count || 0);
        const activeRes = Number(activeReservationsRes?.count || 0);
        const freeCapacity = entry.syl.capacityMax - accepted - activeRes;

        if (freeCapacity <= 0) {
          throw AppError.badRequest('Aucune place disponible à réserver pour cette offre.');
        }

        // Create temporary reservation
        await tx.insert(capacityReservations).values({
          schoolYearLevelId: entry.syl.id,
          registrationId: entry.reg.id,
          waitingListEntryId: entryId,
          status: 'ACTIVE',
          reservedAt: now,
          expiresAt: expiresAtDate,
        });
      }

      // Update waiting list entry
      const [updated] = await tx
        .update(waitingListEntries)
        .set({
          status: 'OFFERED',
          offerStatus: 'PENDING',
          offerCreatedAt: now,
          offerExpiresAt: expiresAtDate,
          updatedAt: now,
        })
        .where(eq(waitingListEntries.id, entryId))
        .returning();

      await tx.insert(auditLogs).values({
        userId: actor.id,
        action: 'PLACE_OFFERED',
        module: 'WAITING_LIST',
        entityType: 'WAITING_LIST_ENTRY',
        entityId: entryId,
        schoolId: entry.syl.schoolId,
        afterJson: { expiresAt: expiresAtDate, reserved: shouldReserve },
        result: 'SUCCESS',
      });

      return updated;
    });
  }

  /**
   * Periodically/lazily expires past-due place offers and releases reserved capacity.
   */
  static async expireOffers(): Promise<number> {
    const db = getDb();
    const now = new Date();

    const expiredOfferEntries = await db
      .select()
      .from(waitingListEntries)
      .where(
        and(
          eq(waitingListEntries.status, 'OFFERED'),
          eq(waitingListEntries.offerStatus, 'PENDING'),
          lt(waitingListEntries.offerExpiresAt, now)
        )
      );

    if (expiredOfferEntries.length === 0) return 0;

    let expiredCount = 0;
    await TransactionRunner.run(async (tx) => {
      for (const entry of expiredOfferEntries) {
        // Mark offer expired & return candidate to ACTIVE queue
        await tx
          .update(waitingListEntries)
          .set({
            status: 'ACTIVE',
            offerStatus: 'EXPIRED',
            updatedAt: now,
          })
          .where(eq(waitingListEntries.id, entry.id));

        // Release associated reservation
        await tx
          .update(capacityReservations)
          .set({
            status: 'EXPIRED',
            releasedAt: now,
            updatedAt: now,
          })
          .where(
            and(
              eq(capacityReservations.waitingListEntryId, entry.id),
              eq(capacityReservations.status, 'ACTIVE')
            )
          );

        expiredCount++;
      }
    });

    return expiredCount;
  }

  /**
   * Temporarily skips a candidate in the queue (e.g. unreachable, missing doc).
   */
  static async skipCandidate(actor: User, entryId: string, options: SkipCandidateOptions) {
    if (!AuthGuard.hasPermission(actor, 'waitinglist.manage')) {
      throw AppError.forbidden('Permission refusée.');
    }

    const db = getDb();
    const [entry] = await db
      .select({ entry: waitingListEntries, syl: schoolYearLevels })
      .from(waitingListEntries)
      .innerJoin(schoolYearLevels, eq(waitingListEntries.schoolYearLevelId, schoolYearLevels.id))
      .where(eq(waitingListEntries.id, entryId));

    if (!entry) throw AppError.notFound('Entrée introuvable.');

    if (!AuthGuard.canAccessSchool(actor, entry.syl.schoolId)) {
      throw AppError.forbidden('Accès refusé pour cet établissement.');
    }

    const now = new Date();
    const [updated] = await db
      .update(waitingListEntries)
      .set({
        status: 'SKIPPED_TEMPORARILY',
        skippedAt: now,
        skipReason: options.reason.trim(),
        skipReviewAt: options.reviewAt ? new Date(options.reviewAt) : null,
        updatedAt: now,
      })
      .where(eq(waitingListEntries.id, entryId))
      .returning();

    await db.insert(auditLogs).values({
      userId: actor.id,
      action: 'WAITLIST_SKIPPED',
      module: 'WAITING_LIST',
      entityType: 'WAITING_LIST_ENTRY',
      entityId: entryId,
      schoolId: entry.syl.schoolId,
      afterJson: options,
      result: 'SUCCESS',
    });

    return updated;
  }

  /**
   * Reactivates a skipped candidate restoring their active FIFO rank.
   */
  static async reactivateCandidate(actor: User, entryId: string) {
    if (!AuthGuard.hasPermission(actor, 'waitinglist.manage')) {
      throw AppError.forbidden('Permission refusée.');
    }

    const db = getDb();
    const [entry] = await db
      .select({ entry: waitingListEntries, syl: schoolYearLevels })
      .from(waitingListEntries)
      .innerJoin(schoolYearLevels, eq(waitingListEntries.schoolYearLevelId, schoolYearLevels.id))
      .where(eq(waitingListEntries.id, entryId));

    if (!entry) throw AppError.notFound('Entrée introuvable.');

    if (!AuthGuard.canAccessSchool(actor, entry.syl.schoolId)) {
      throw AppError.forbidden('Accès refusé pour cet établissement.');
    }

    const now = new Date();
    const [updated] = await db
      .update(waitingListEntries)
      .set({
        status: 'ACTIVE',
        skippedAt: null,
        skipReason: null,
        skipReviewAt: null,
        updatedAt: now,
      })
      .where(eq(waitingListEntries.id, entryId))
      .returning();

    await db.insert(auditLogs).values({
      userId: actor.id,
      action: 'WAITLIST_REACTIVATED',
      module: 'WAITING_LIST',
      entityType: 'WAITING_LIST_ENTRY',
      entityId: entryId,
      schoolId: entry.syl.schoolId,
      result: 'SUCCESS',
    });

    return updated;
  }

  /**
   * Explicitly removes a candidate from the waiting list with reason code and registration outcome.
   */
  static async removeFromWaitingList(
    actor: User,
    entryId: string,
    options: RemoveFromWaitingListOptions
  ) {
    if (!AuthGuard.hasPermission(actor, 'waitinglist.manage')) {
      throw AppError.forbidden('Permission refusée.');
    }

    const db = getDb();
    const [entry] = await db
      .select({ entry: waitingListEntries, syl: schoolYearLevels, reg: registrations })
      .from(waitingListEntries)
      .innerJoin(schoolYearLevels, eq(waitingListEntries.schoolYearLevelId, schoolYearLevels.id))
      .innerJoin(registrations, eq(waitingListEntries.registrationId, registrations.id))
      .where(eq(waitingListEntries.id, entryId));

    if (!entry) throw AppError.notFound('Entrée introuvable.');

    if (!AuthGuard.canAccessSchool(actor, entry.syl.schoolId)) {
      throw AppError.forbidden('Accès refusé pour cet établissement.');
    }

    const now = new Date();
    const outcome = options.registrationOutcome || 'CANCELLED';

    return TransactionRunner.run(async (tx) => {
      // 1. Mark entry REMOVED
      const [updatedEntry] = await tx
        .update(waitingListEntries)
        .set({
          status: 'REMOVED',
          removedAt: now,
          removeReason: options.comment?.trim() || null,
          removeReasonCode: options.reasonCode,
          updatedAt: now,
        })
        .where(eq(waitingListEntries.id, entryId))
        .returning();

      // 2. Release any active reservation
      await tx
        .update(capacityReservations)
        .set({
          status: 'RELEASED',
          releasedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(capacityReservations.waitingListEntryId, entryId),
            eq(capacityReservations.status, 'ACTIVE')
          )
        );

      // 3. Update registration status
      await tx
        .update(registrations)
        .set({
          status: outcome,
          updatedAt: now,
        })
        .where(eq(registrations.id, entry.reg.id));

      // 4. Record status history
      await tx.insert(registrationStatusHistory).values({
        registrationId: entry.reg.id,
        fromStatus: entry.reg.status,
        toStatus: outcome,
        publicComment: `Retrait de liste d’attente : ${options.reasonCode} - ${options.comment || ''}`,
        changedByUserId: actor.id,
      });

      // 5. Record audit log
      await tx.insert(auditLogs).values({
        userId: actor.id,
        action: 'WAITLIST_REMOVED',
        module: 'WAITING_LIST',
        entityType: 'WAITING_LIST_ENTRY',
        entityId: entryId,
        schoolId: entry.syl.schoolId,
        afterJson: options,
        result: 'SUCCESS',
      });

      return updatedEntry;
    });
  }

  /**
   * Transfers a candidate from their current level/school to a new destination school_year_level.
   */
  static async transferCandidate(actor: User, registrationId: string, destinationSchoolYearLevelId: string) {
    if (!AuthGuard.hasPermission(actor, 'waitinglist.manage')) {
      throw AppError.forbidden('Permission refusée.');
    }

    const db = getDb();
    const [reg] = await db.select().from(registrations).where(eq(registrations.id, registrationId));
    if (!reg) throw AppError.notFound('Dossier introuvable.');

    const [destSyl] = await db
      .select({ syl: schoolYearLevels, school: schools, level: levels })
      .from(schoolYearLevels)
      .innerJoin(schools, eq(schoolYearLevels.schoolId, schools.id))
      .innerJoin(levels, eq(schoolYearLevels.levelId, levels.id))
      .where(eq(schoolYearLevels.id, destinationSchoolYearLevelId));

    if (!destSyl) throw AppError.notFound('Niveau de destination introuvable.');

    if (!AuthGuard.canAccessSchool(actor, destSyl.school.id)) {
      throw AppError.forbidden('Accès refusé pour l’établissement de destination.');
    }

    const now = new Date();

    return TransactionRunner.run(async (tx) => {
      // 1. Close existing active waiting entry
      const [existingActiveEntry] = await tx
        .select()
        .from(waitingListEntries)
        .where(
          and(
            eq(waitingListEntries.registrationId, registrationId),
            inArray(waitingListEntries.status, ['ACTIVE', 'SKIPPED_TEMPORARILY', 'OFFERED'])
          )
        );

      if (existingActiveEntry) {
        await tx
          .update(waitingListEntries)
          .set({
            status: 'REMOVED',
            removedAt: now,
            removeReasonCode: 'TRANSFERRED',
            removeReason: `Transféré vers ${destSyl.school.name} - ${destSyl.level.nameFr}`,
            updatedAt: now,
          })
          .where(eq(waitingListEntries.id, existingActiveEntry.id));
      }

      // 2. Check destination capacity
      const destCapacity = await CapacityService.getCapacitySummary(destinationSchoolYearLevelId);
      const isDestFull =
        destSyl.syl.capacityMode === 'LIMITED' &&
        destSyl.syl.capacityMax !== null &&
        destCapacity.acceptedCount >= destSyl.syl.capacityMax;

      let newStatus = 'UNDER_REVIEW';

      if (isDestFull) {
        if (destSyl.syl.fullBehavior === 'WAITLIST') {
          newStatus = 'WAITLISTED';
          await tx.insert(waitingListEntries).values({
            schoolYearLevelId: destinationSchoolYearLevelId,
            registrationId,
            enteredAt: now,
            status: 'ACTIVE',
            priorityType: 'GENERAL',
          });
        }
      }

      // 3. Update registration
      await tx
        .update(registrations)
        .set({
          schoolId: destSyl.school.id,
          levelId: destSyl.level.id,
          schoolYearLevelId: destinationSchoolYearLevelId,
          status: newStatus as any,
          updatedAt: now,
        })
        .where(eq(registrations.id, registrationId));

      // 4. Record history & audit log
      await tx.insert(registrationStatusHistory).values({
        registrationId,
        fromStatus: reg.status,
        toStatus: newStatus as any,
        publicComment: `Transfert vers ${destSyl.school.name} - ${destSyl.level.nameFr}`,
        changedByUserId: actor.id,
      });

      await tx.insert(auditLogs).values({
        userId: actor.id,
        action: 'REGISTRATION_TRANSFERRED',
        module: 'WAITING_LIST',
        entityType: 'REGISTRATION',
        entityId: registrationId,
        schoolId: destSyl.school.id,
        afterJson: { fromSyl: reg.schoolYearLevelId, toSyl: destinationSchoolYearLevelId, newStatus },
        result: 'SUCCESS',
      });

      return { success: true, destinationStatus: newStatus };
    });
  }

  /**
   * Consumes CAPACITY_RELEASED event when an accepted student is cancelled/refused.
   * Emits notification alerts and identifies next candidate without auto-accepting.
   */
  static async handleCapacityReleased(schoolYearLevelId: string, releasedCount = 1) {
    const db = getDb();
    const capacitySummary = await CapacityService.getCapacitySummary(schoolYearLevelId);

    const [syl] = await db
      .select({ syl: schoolYearLevels, school: schools, level: levels })
      .from(schoolYearLevels)
      .innerJoin(schools, eq(schoolYearLevels.schoolId, schools.id))
      .innerJoin(levels, eq(schoolYearLevels.levelId, levels.id))
      .where(eq(schoolYearLevels.id, schoolYearLevelId));

    if (!syl) return;

    const [waitingCountRes] = await db
      .select({ count: sql<number>`count(*)` })
      .from(waitingListEntries)
      .where(
        and(
          eq(waitingListEntries.schoolYearLevelId, schoolYearLevelId),
          eq(waitingListEntries.status, 'ACTIVE')
        )
      );

    const activeWaitingCount = Number(waitingCountRes?.count || 0);

    if (capacitySummary.remainingPlaces && capacitySummary.remainingPlaces > 0 && activeWaitingCount > 0) {
      const nextCandidate = await this.getNextEligibleCandidate(schoolYearLevelId);

      // Create staff notification alert
      await db.insert(notifications).values({
        schoolId: syl.school.id,
        title: `Place disponible en ${syl.level.nameFr}`,
        message: `${releasedCount} place(s) disponible(s) en ${syl.level.nameFr} (${syl.school.name}). ${activeWaitingCount} candidat(s) en attente. Candidat recommandé : ${nextCandidate?.studentFullName || 'N/A'}.`,
        type: 'WAITING_PLACE_AVAILABLE',
        targetEntityType: 'SCHOOL_YEAR_LEVEL',
        targetEntityId: schoolYearLevelId,
      });
    }
  }

  /**
   * Returns waiting list summary card metrics for an individual level.
   */
  static async getWaitingSummary(schoolYearLevelId: string) {
    const db = getDb();
    const queue = await this.getQueue(schoolYearLevelId);
    const capacitySummary = await CapacityService.getCapacitySummary(schoolYearLevelId);

    const activeEntries = queue.filter((q) => q.status === 'ACTIVE');
    const offeredEntries = queue.filter((q) => q.status === 'OFFERED');
    const skippedEntries = queue.filter((q) => q.status === 'SKIPPED_TEMPORARILY');

    const nextCandidate = activeEntries.length > 0 ? activeEntries[0] : null;
    const oldestEntry = activeEntries.length > 0 ? activeEntries[0].enteredAt : null;

    return {
      schoolYearLevelId,
      activeWaitingCount: activeEntries.length,
      availablePlaces: capacitySummary.remainingPlaces ?? 0,
      nextCandidate,
      oldestWaitingDate: oldestEntry,
      pendingOffersCount: offeredEntries.length,
      skippedCount: skippedEntries.length,
    };
  }

  /**
   * Returns aggregated waiting list analytics and conversion rates.
   */
  static async getWaitingAnalytics(actor: User, schoolIdFilter?: string) {
    const db = getDb();

    let entriesQuery = db
      .select({
        entry: waitingListEntries,
        syl: schoolYearLevels,
      })
      .from(waitingListEntries)
      .innerJoin(schoolYearLevels, eq(waitingListEntries.schoolYearLevelId, schoolYearLevels.id));

    const rows = await entriesQuery;

    let filtered = rows;
    if (actor.role !== 'SUPER_ADMIN') {
      filtered = filtered.filter((r) => actor.allowedSchoolIds && actor.allowedSchoolIds.includes(r.syl.schoolId));
    }
    if (schoolIdFilter) {
      filtered = filtered.filter((r) => r.syl.schoolId === schoolIdFilter);
    }

    const activeCount = filtered.filter((r) => ['ACTIVE', 'SKIPPED_TEMPORARILY', 'OFFERED'].includes(r.entry.status)).length;
    const promotedCount = filtered.filter((r) => r.entry.status === 'PROMOTED').length;
    const removedCount = filtered.filter((r) => r.entry.status === 'REMOVED').length;
    const expiredOffersCount = filtered.filter((r) => r.entry.offerStatus === 'EXPIRED').length;

    const totalExited = promotedCount + removedCount;
    const conversionRate = totalExited > 0 ? Math.round((promotedCount / totalExited) * 10000) / 100 : 0;

    return {
      currentActiveWaitingCount: activeCount,
      totalPromotedCount: promotedCount,
      totalRemovedCount: removedCount,
      totalExpiredOffersCount: expiredOffersCount,
      conversionRate, // e.g. 65.5%
    };
  }

  /**
   * Returns sanitized client-safe waiting status for parent tracking.
   * Hides numeric queue position unless showWaitingPositionClient is true.
   */
  static async getClientWaitingStatus(registrationId: string, schoolYearLevelId: string) {
    const db = getDb();
    const [syl] = await db
      .select()
      .from(schoolYearLevels)
      .where(eq(schoolYearLevels.id, schoolYearLevelId));

    if (!syl) return null;

    const queue = await this.getQueue(schoolYearLevelId);
    const candidateItem = queue.find((q) => q.registrationId === registrationId);

    if (!candidateItem) return null;

    const showPosition = (syl as any).showWaitingPositionClient ?? false;

    return {
      status: 'WAITLISTED',
      displayMessageFr:
        'Ce niveau est actuellement complet. Votre demande est enregistrée sur liste d’attente. Notre équipe vous contactera si une place devient disponible.',
      displayMessageAr:
        'هذا المستوى مكتمل حالياً. طلبكم مسجل في قائمة الانتظار. سيتصل بكم فريقنا عند توفر مقعد.',
      position: showPosition ? candidateItem.position : null,
      enteredAt: candidateItem.enteredAt,
    };
  }
}
