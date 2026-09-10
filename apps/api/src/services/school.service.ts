/**
 * Multi-School Establishment Domain Service for VISION SCHOOL.
 * Handles establishment CRUD, coordinate validation, status lifecycle,
 * school-scoped access control, and public-safe sanitization.
 */

import {
  getDb,
  schools,
  auditLogs,
  registrations,
  schoolYearLevels,
  userSchoolAccess,
  schoolLevelDocumentRequirements,
  tariffs,
  waitingListEntries,
  registrationDocuments,
  schoolMediaAssignments,
  systemSettings,
  TransactionRunner,
} from '@vision-school/database';
import { eq, and, isNull, ilike, or, sql, inArray } from 'drizzle-orm';
import { AppError, User } from '@vision-school/shared';
import { AuthGuard } from '@vision-school/auth';

export interface CreateSchoolPayload {
  name: string;
  shortName?: string;
  code: string;
  description?: string;
  phonePrimary?: string;
  phoneSecondary?: string;
  whatsapp?: string;
  emailPrimary?: string;
  emailSecondary?: string;
  website?: string;
  address?: string;
  wilaya?: string;
  commune?: string;
  postalCode?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  googleMapsUrl?: string;
  status?: string;
  isActive?: boolean;
}

export interface UpdateSchoolPayload extends Partial<CreateSchoolPayload> {}

export interface PublicSchoolDto {
  id: string;
  name: string;
  shortName: string | null;
  description: string | null;
  phonePrimary: string | null;
  whatsapp: string | null;
  emailPrimary: string | null;
  website: string | null;
  address: string | null;
  wilaya: string | null;
  commune: string | null;
  postalCode: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  googleMapsUrl: string | null;
}

export class SchoolService {
  /**
   * Validates geographic coordinates.
   */
  private static validateCoordinates(lat?: number, lng?: number): void {
    if (lat !== undefined && (lat < -90 || lat > 90)) {
      throw AppError.badRequest('La latitude doit être comprise entre -90 et 90 degrés.');
    }
    if (lng !== undefined && (lng < -180 || lng > 180)) {
      throw AppError.badRequest('La longitude doit être comprise entre -180 et 180 degrés.');
    }
  }

  /**
   * Returns list of public-safe active schools.
   * Strips all internal metadata, user assignments, and admin settings.
   */
  static async getPublicSchools(): Promise<PublicSchoolDto[]> {
    const db = getDb();
    const rows = await db
      .select()
      .from(schools)
      .where(and(eq(schools.isActive, true), eq(schools.status, 'ACTIVE'), isNull(schools.archivedAt)));

    return rows.map((s) => ({
      id: s.id,
      name: s.name,
      shortName: s.shortName,
      description: s.description,
      phonePrimary: s.phonePrimary,
      whatsapp: s.whatsapp,
      emailPrimary: s.emailPrimary,
      website: s.website,
      address: s.address,
      wilaya: s.wilaya,
      commune: s.commune,
      postalCode: s.postalCode,
      country: s.country,
      latitude: s.latitude,
      longitude: s.longitude,
      googleMapsUrl: s.googleMapsUrl,
    }));
  }

  /**
   * Returns a single public-safe school by ID.
   */
  static async getPublicSchoolById(id: string): Promise<PublicSchoolDto> {
    const db = getDb();
    const [s] = await db
      .select()
      .from(schools)
      .where(and(eq(schools.id, id), eq(schools.isActive, true), isNull(schools.archivedAt)));

    if (!s) {
      throw AppError.notFound('Établissement');
    }

    return {
      id: s.id,
      name: s.name,
      shortName: s.shortName,
      description: s.description,
      phonePrimary: s.phonePrimary,
      whatsapp: s.whatsapp,
      emailPrimary: s.emailPrimary,
      website: s.website,
      address: s.address,
      wilaya: s.wilaya,
      commune: s.commune,
      postalCode: s.postalCode,
      country: s.country,
      latitude: s.latitude,
      longitude: s.longitude,
      googleMapsUrl: s.googleMapsUrl,
    };
  }

  /**
   * Returns full school list for administrators with school-scoped access filters and status filtering.
   */
  static async getAllSchools(actor: User, filters?: { status?: string; search?: string }) {
    if (!AuthGuard.hasPermission(actor, 'school.read')) {
      throw AppError.forbidden('Permission refusée pour consulter les établissements.');
    }

    const db = getDb();
    let rows = await db.select().from(schools);

    // Apply school-scoped filtering only for users without school.manage permission and not SUPER_ADMIN
    if (actor.role !== 'SUPER_ADMIN' && !AuthGuard.hasPermission(actor, 'school.manage')) {
      rows = rows.filter((s) => actor.allowedSchoolIds && actor.allowedSchoolIds.includes(s.id));
    }

    // Status filtering: ACTIVE (default), ARCHIVED, or ALL
    const statusFilter = (filters?.status || 'ACTIVE').toUpperCase();
    if (statusFilter === 'ACTIVE') {
      rows = rows.filter((s) => s.status === 'ACTIVE' && !s.archivedAt);
    } else if (statusFilter === 'ARCHIVED') {
      rows = rows.filter((s) => s.status === 'ARCHIVED' || s.archivedAt !== null);
    } // If 'ALL', show all schools

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      rows = rows.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          (s.wilaya && s.wilaya.toLowerCase().includes(q))
      );
    }

    return rows;
  }

  /**
   * Returns single school by ID with school-scoped access check.
   */
  static async getSchoolById(actor: User, id: string) {
    if (!AuthGuard.hasPermission(actor, 'school.read')) {
      throw AppError.forbidden('Permission refusée.');
    }

    if (!AuthGuard.canAccessSchool(actor, id)) {
      throw AppError.forbidden('Accès refusé pour cet établissement.');
    }

    const db = getDb();
    const [school] = await db.select().from(schools).where(eq(schools.id, id));
    if (!school) {
      throw AppError.notFound('Établissement');
    }

    return school;
  }

  /**
   * Creates a new school establishment.
   */
  static async createSchool(actor: User, payload: CreateSchoolPayload) {
    if (!AuthGuard.hasPermission(actor, 'school.manage')) {
      throw AppError.forbidden('Permission refusée pour créer un établissement.');
    }

    if (!payload.name || !payload.code) {
      throw AppError.badRequest('Le nom et le code d\'établissement sont obligatoires.');
    }

    this.validateCoordinates(payload.latitude, payload.longitude);

    const db = getDb();
    const cleanCode = payload.code.trim().toUpperCase();

    // Check unique code (with distinct messaging for archived records)
    const [existing] = await db
      .select({ id: schools.id, name: schools.name, status: schools.status, archivedAt: schools.archivedAt })
      .from(schools)
      .where(eq(schools.code, cleanCode));

    if (existing) {
      if (existing.status === 'ARCHIVED' || existing.archivedAt !== null) {
        const err = new AppError(
          `Un établissement archivé ("${existing.name}") utilise déjà le code ${cleanCode}. Vous pouvez le restaurer.`,
          'VALIDATION_ERROR',
          400
        );
        (err as any).details = {
          existingSchoolId: existing.id,
          isArchived: true,
          code: cleanCode,
          name: existing.name,
        };
        throw err;
      }
      throw AppError.badRequest(`Un établissement avec le code ${cleanCode} existe déjà.`);
    }

    const [newSchool] = await db
      .insert(schools)
      .values({
        name: payload.name.trim(),
        shortName: payload.shortName?.trim() || null,
        code: cleanCode,
        description: payload.description?.trim() || null,
        phonePrimary: payload.phonePrimary?.trim() || null,
        phoneSecondary: payload.phoneSecondary?.trim() || null,
        whatsapp: payload.whatsapp?.trim() || null,
        emailPrimary: payload.emailPrimary?.trim() || null,
        emailSecondary: payload.emailSecondary?.trim() || null,
        website: payload.website?.trim() || null,
        address: payload.address?.trim() || null,
        wilaya: payload.wilaya?.trim() || null,
        commune: payload.commune?.trim() || null,
        postalCode: payload.postalCode?.trim() || null,
        country: payload.country?.trim() || 'Algérie',
        latitude: payload.latitude || null,
        longitude: payload.longitude || null,
        googleMapsUrl: payload.googleMapsUrl?.trim() || null,
        status: payload.status || 'ACTIVE',
        isActive: payload.isActive !== undefined ? payload.isActive : true,
      })
      .returning();

    // Grant access to creator in user_school_access if non-super-admin
    if (actor.role !== 'SUPER_ADMIN') {
      try {
        await db.insert(userSchoolAccess).values({
          userId: actor.id,
          schoolId: newSchool.id,
        });
        if (actor.allowedSchoolIds && !actor.allowedSchoolIds.includes(newSchool.id)) {
          actor.allowedSchoolIds.push(newSchool.id);
        }
      } catch {
        // Non-critical
      }
    }

    await db.insert(auditLogs).values({
      userId: actor.id,
      action: 'SCHOOL_CREATED',
      module: 'SCHOOLS',
      entityType: 'SCHOOL',
      entityId: newSchool.id,
      schoolId: newSchool.id,
      afterJson: { code: cleanCode, name: payload.name },
      result: 'SUCCESS',
    });

    return newSchool;
  }

  /**
   * Updates an existing school establishment.
   */
  static async updateSchool(actor: User, id: string, payload: UpdateSchoolPayload) {
    if (!AuthGuard.hasPermission(actor, 'school.manage')) {
      throw AppError.forbidden('Permission refusée.');
    }

    if (!AuthGuard.canAccessSchool(actor, id)) {
      throw AppError.forbidden('Accès refusé pour cet établissement.');
    }

    const db = getDb();
    const [existing] = await db.select().from(schools).where(eq(schools.id, id));
    if (!existing) {
      throw AppError.notFound('Établissement');
    }

    if (payload.latitude !== undefined || payload.longitude !== undefined) {
      this.validateCoordinates(
        payload.latitude !== undefined ? payload.latitude : existing.latitude || undefined,
        payload.longitude !== undefined ? payload.longitude : existing.longitude || undefined
      );
    }

    if (payload.code && payload.code.trim().toUpperCase() !== existing.code) {
      const cleanCode = payload.code.trim().toUpperCase();
      const [duplicate] = await db.select({ id: schools.id }).from(schools).where(eq(schools.code, cleanCode));
      if (duplicate) {
        throw AppError.badRequest(`Le code ${cleanCode} est déjà utilisé par un autre établissement.`);
      }
    }

    const [updated] = await db
      .update(schools)
      .set({
        name: payload.name !== undefined ? payload.name.trim() : existing.name,
        shortName: payload.shortName !== undefined ? payload.shortName.trim() : existing.shortName,
        code: payload.code !== undefined ? payload.code.trim().toUpperCase() : existing.code,
        description: payload.description !== undefined ? payload.description : existing.description,
        phonePrimary: payload.phonePrimary !== undefined ? payload.phonePrimary : existing.phonePrimary,
        phoneSecondary: payload.phoneSecondary !== undefined ? payload.phoneSecondary : existing.phoneSecondary,
        whatsapp: payload.whatsapp !== undefined ? payload.whatsapp : existing.whatsapp,
        emailPrimary: payload.emailPrimary !== undefined ? payload.emailPrimary : existing.emailPrimary,
        emailSecondary: payload.emailSecondary !== undefined ? payload.emailSecondary : existing.emailSecondary,
        website: payload.website !== undefined ? payload.website : existing.website,
        address: payload.address !== undefined ? payload.address : existing.address,
        wilaya: payload.wilaya !== undefined ? payload.wilaya : existing.wilaya,
        commune: payload.commune !== undefined ? payload.commune : existing.commune,
        postalCode: payload.postalCode !== undefined ? payload.postalCode : existing.postalCode,
        country: payload.country !== undefined ? payload.country : existing.country,
        latitude: payload.latitude !== undefined ? payload.latitude : existing.latitude,
        longitude: payload.longitude !== undefined ? payload.longitude : existing.longitude,
        googleMapsUrl: payload.googleMapsUrl !== undefined ? payload.googleMapsUrl : existing.googleMapsUrl,
        status: payload.status !== undefined ? payload.status : existing.status,
        isActive: payload.isActive !== undefined ? payload.isActive : existing.isActive,
        updatedAt: new Date(),
      })
      .where(eq(schools.id, id))
      .returning();

    await db.insert(auditLogs).values({
      userId: actor.id,
      action: 'SCHOOL_UPDATED',
      module: 'SCHOOLS',
      entityType: 'SCHOOL',
      entityId: id,
      schoolId: id,
      beforeJson: existing,
      afterJson: updated,
      result: 'SUCCESS',
    });

    return updated;
  }

  /**
   * Deactivates a school. Preserves all historical registrations and records.
   */
  static async deactivateSchool(actor: User, id: string) {
    return this.updateSchool(actor, id, { isActive: false, status: 'INACTIVE' });
  }

  /**
   * Activates a school.
   */
  static async activateSchool(actor: User, id: string) {
    return this.updateSchool(actor, id, { isActive: true, status: 'ACTIVE' });
  }

  /**
   * Archives a school (read-only historical state).
   */
  static async archiveSchool(actor: User, id: string) {
    if (!AuthGuard.hasPermission(actor, 'school.manage')) {
      throw AppError.forbidden('Permission refusée.');
    }
    const db = getDb();
    const [existing] = await db.select().from(schools).where(eq(schools.id, id));
    if (!existing) {
      throw AppError.notFound('Établissement');
    }

    const [updated] = await db
      .update(schools)
      .set({
        isActive: false,
        status: 'ARCHIVED',
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(schools.id, id))
      .returning();

    await db.insert(auditLogs).values({
      userId: actor.id,
      action: 'SCHOOL_ARCHIVED',
      module: 'SCHOOLS',
      entityType: 'SCHOOL',
      entityId: id,
      schoolId: id,
      afterJson: { status: 'ARCHIVED', archivedAt: updated.archivedAt },
      result: 'SUCCESS',
    });

    return {
      id,
      archived: true,
      school: updated,
      message: 'Établissement archivé avec succès. Les données historiques sont conservées.',
    };
  }

  /**
   * Restores an archived school back to ACTIVE state.
   */
  static async restoreSchool(actor: User, id: string) {
    if (!AuthGuard.hasPermission(actor, 'school.manage')) {
      throw AppError.forbidden('Permission refusée.');
    }
    const db = getDb();
    const [existing] = await db.select().from(schools).where(eq(schools.id, id));
    if (!existing) {
      throw AppError.notFound('Établissement');
    }

    const [restored] = await db
      .update(schools)
      .set({
        isActive: true,
        status: 'ACTIVE',
        archivedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(schools.id, id))
      .returning();

    await db.insert(auditLogs).values({
      userId: actor.id,
      action: 'SCHOOL_RESTORED',
      module: 'SCHOOLS',
      entityType: 'SCHOOL',
      entityId: id,
      schoolId: id,
      afterJson: { status: 'ACTIVE', archivedAt: null },
      result: 'SUCCESS',
    });

    return {
      id,
      restored: true,
      school: restored,
      message: 'Établissement restauré avec succès.',
    };
  }

  /**
   * Generates a preview of what will be deleted and verifies whether permanent deletion is allowed.
   * Distinguishes configuration data from historical/business data.
   */
  static async getSchoolDeletePreview(actor: User, id: string) {
    if (!AuthGuard.hasPermission(actor, 'school.read') && !AuthGuard.isSuperAdmin(actor)) {
      throw AppError.forbidden('Permission refusée.');
    }

    const db = getDb();
    const [school] = await db.select().from(schools).where(eq(schools.id, id));
    if (!school) {
      throw AppError.notFound('Établissement');
    }

    // 1. Fetch school_year_levels for this school
    const sylRows = await db
      .select({ id: schoolYearLevels.id, capacityMax: schoolYearLevels.capacityMax })
      .from(schoolYearLevels)
      .where(eq(schoolYearLevels.schoolId, id));

    const sylIds = sylRows.map((r) => r.id);

    // 2. Query Historical / Business Data
    // a. Registrations count (both by schoolId and by schoolYearLevelId)
    const [regCountRow] = await db
      .select({
        total: sql<number>`count(*)::int`,
        accepted: sql<number>`count(*) filter (where ${registrations.status} = 'ACCEPTED')::int`,
      })
      .from(registrations)
      .where(
        sylIds.length > 0
          ? or(eq(registrations.schoolId, id), inArray(registrations.schoolYearLevelId, sylIds))
          : eq(registrations.schoolId, id)
      );

    const registrationsCount = regCountRow?.total || 0;
    const acceptedRegistrationsCount = regCountRow?.accepted || 0;

    // b. Waiting list entries
    let waitingListCount = 0;
    if (sylIds.length > 0) {
      const [wlRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(waitingListEntries)
        .where(inArray(waitingListEntries.schoolYearLevelId, sylIds));
      waitingListCount = wlRow?.count || 0;
    }

    // c. Student documents
    let studentDocsCount = 0;
    if (registrationsCount > 0) {
      const [docsRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(registrationDocuments)
        .innerJoin(registrations, eq(registrationDocuments.registrationId, registrations.id))
        .where(
          sylIds.length > 0
            ? or(eq(registrations.schoolId, id), inArray(registrations.schoolYearLevelId, sylIds))
            : eq(registrations.schoolId, id)
        );
      studentDocsCount = docsRow?.count || 0;
    }

    // 3. Query Configuration Data
    const levelAssignmentsCount = sylRows.length;
    const capacitiesCount = sylRows.filter((r) => r.capacityMax !== null).length;

    let tariffsCount = 0;
    if (sylIds.length > 0) {
      const [tariffsRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(tariffs)
        .where(inArray(tariffs.schoolYearLevelId, sylIds));
      tariffsCount = tariffsRow?.count || 0;
    }

    const [docReqRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schoolLevelDocumentRequirements)
      .where(eq(schoolLevelDocumentRequirements.schoolId, id));
    const documentRequirementsCount = docReqRow?.count || 0;

    const [mediaAssRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(schoolMediaAssignments)
      .where(eq(schoolMediaAssignments.schoolId, id));
    const mediaAssignmentsCount = mediaAssRow?.count || 0;

    const canPermanentlyDelete =
      registrationsCount === 0 && waitingListCount === 0 && studentDocsCount === 0;

    return {
      canPermanentlyDelete,
      blockingHistoricalData: {
        registrations: registrationsCount,
        acceptedRegistrations: acceptedRegistrationsCount,
        waitingListEntries: waitingListCount,
        studentDocuments: studentDocsCount,
      },
      configurationToDelete: {
        levelAssignments: levelAssignmentsCount,
        capacities: capacitiesCount,
        tariffs: tariffsCount,
        documentRequirements: documentRequirementsCount,
        mediaAssignments: mediaAssignmentsCount,
      },
      school: {
        id: school.id,
        name: school.name,
        code: school.code,
        status: school.status,
      },
    };
  }

  /**
   * Permanently deletes a school via controlled cascade cleanup if only configuration data exists.
   * If any historical business data (registrations, waiting lists) exists, permanent deletion is BLOCKED.
   * Restricted to SUPER_ADMIN or users with school.delete permission.
   */
  static async permanentDeleteSchool(actor: User, id: string) {
    if (!AuthGuard.isSuperAdmin(actor) && !AuthGuard.hasPermission(actor, 'school.delete')) {
      throw AppError.forbidden(
        'Permission refusée : seul le Super Administrateur peut procéder à la suppression définitive d\'un établissement.'
      );
    }

    const db = getDb();
    const [existing] = await db.select().from(schools).where(eq(schools.id, id));
    if (!existing) {
      throw AppError.notFound('Établissement');
    }

    return TransactionRunner.run(async (tx) => {
      // 1. Fetch school_year_levels for this school
      const sylRows = await tx
        .select({ id: schoolYearLevels.id })
        .from(schoolYearLevels)
        .where(eq(schoolYearLevels.schoolId, id));
      const sylIds = sylRows.map((r) => r.id);

      // 2. Strict check: verify NO protected historical/business data exists
      const [regCheck] = await tx
        .select({
          total: sql<number>`count(*)::int`,
          accepted: sql<number>`count(*) filter (where ${registrations.status} = 'ACCEPTED')::int`,
        })
        .from(registrations)
        .where(
          sylIds.length > 0
            ? or(eq(registrations.schoolId, id), inArray(registrations.schoolYearLevelId, sylIds))
            : eq(registrations.schoolId, id)
        );

      let wlCheckCount = 0;
      if (sylIds.length > 0) {
        const [wlRow] = await tx
          .select({ count: sql<number>`count(*)::int` })
          .from(waitingListEntries)
          .where(inArray(waitingListEntries.schoolYearLevelId, sylIds));
        wlCheckCount = wlRow?.count || 0;
      }

      const totalRegs = regCheck?.total || 0;
      const acceptedRegs = regCheck?.accepted || 0;
      if (totalRegs > 0 || wlCheckCount > 0) {
        throw AppError.badRequest(
          `Suppression définitive impossible : cet établissement possède des dossiers d'inscription ou des données historiques (${totalRegs} inscription(s) dont ${acceptedRegs} acceptée(s), ${wlCheckCount} entrée(s) sur liste d'attente). Veuillez utiliser l'archivage pour préserver l'historique.`
        );
      }

      // 3. Controlled Cascade Cleanup of Configuration Data (in dependency order)
      // a. Delete school-specific document requirements
      await tx
        .delete(schoolLevelDocumentRequirements)
        .where(eq(schoolLevelDocumentRequirements.schoolId, id));

      // b. Delete school-specific tariffs on schoolYearLevels
      if (sylIds.length > 0) {
        await tx
          .delete(tariffs)
          .where(inArray(tariffs.schoolYearLevelId, sylIds));
      }

      // c. Delete school_year_levels (deleting the relationship ONLY, preserving global 'levels' table!)
      await tx
        .delete(schoolYearLevels)
        .where(eq(schoolYearLevels.schoolId, id));

      // d. Delete school-specific media assignments (preserving media_assets)
      await tx
        .delete(schoolMediaAssignments)
        .where(eq(schoolMediaAssignments.schoolId, id));

      // e. Delete user school access links
      await tx
        .delete(userSchoolAccess)
        .where(eq(userSchoolAccess.schoolId, id));

      // f. Delete school system settings
      await tx
        .delete(systemSettings)
        .where(eq(systemSettings.schoolId, id));

      // g. Nullify schoolId in audit_logs and soft references
      await tx
        .update(auditLogs)
        .set({ schoolId: null })
        .where(eq(auditLogs.schoolId, id));

      // h. Insert audit log for permanent deletion
      await tx.insert(auditLogs).values({
        userId: actor.id,
        action: 'SCHOOL_PERMANENTLY_DELETED',
        module: 'SCHOOLS',
        entityType: 'SCHOOL',
        entityId: id,
        schoolId: null,
        beforeJson: {
          id: existing.id,
          name: existing.name,
          code: existing.code,
          status: existing.status,
          cleanedConfigurations: {
            sylCount: sylIds.length,
          },
        },
        result: 'SUCCESS',
      });

      // i. Delete the school itself (which releases its unique code)
      await tx.delete(schools).where(eq(schools.id, id));

      return {
        id,
        deleted: true,
        code: existing.code,
        message: `L'établissement "${existing.name}" (${existing.code}) et ses configurations associées ont été supprimés définitivement. Le code unique a été libéré.`,
      };
    });
  }

  /**
   * Main entry point for delete/archive requests.
   * If permanent is true, attempts permanent deletion (with controlled cascade cleanup).
   * Otherwise, safely archives the school.
   */
  static async deleteSchool(actor: User, id: string, permanent: boolean = false) {
    if (permanent) {
      return this.permanentDeleteSchool(actor, id);
    }
    return this.archiveSchool(actor, id);
  }
}
