/**
 * Student Registration Document Management Service for VISION SCHOOL.
 * Handles document requirements hierarchy, private uploads, immutable versioning,
 * admin review workflows (validate, reject, request replacement), dossier completeness,
 * and signed temporary URL access.
 */

import { getDb, TransactionRunner } from '@vision-school/database';
import {
  documentTypes,
  schoolLevelDocumentRequirements,
  registrationDocuments,
  registrations,
  schoolYearLevels,
  students,
  parents,
  schools,
  levels,
  cycles,
  academicYears,
  levelChoices,
  auditLogs,
} from '@vision-school/database';
import { eq, and, sql, desc, asc, isNull, inArray, or } from 'drizzle-orm';
import { AppError, User } from '@vision-school/shared';
import { AuthGuard } from '@vision-school/auth';
import { StorageService } from './storage.service';
import { AcademicYearService } from './academic-year.service';

export interface DocumentUploadInput {
  buffer: Buffer;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface DocumentRequirementDto {
  id: string;
  documentTypeId: string;
  nameFr: string;
  nameAr: string | null;
  descriptionFr: string | null;
  descriptionAr: string | null;
  fileRuleType: string;
  maxFileSizeBytes: number;
  maxFiles: number;
  isRequired: boolean;
  blockSubmissionIfMissing: boolean;
  showClient: boolean;
  isActive: boolean;
  displayOrder: number;
  precedenceLevel: 'CHOICE' | 'LEVEL' | 'CYCLE' | 'GLOBAL';
}

export interface DocumentCompletenessSummary {
  registrationId: string;
  requiredCount: number;
  requiredProvidedCount: number;
  requiredValidatedCount: number;
  missingRequiredCount: number;
  pendingRequiredCount: number;
  replacementRequiredCount: number;
  optionalProvidedCount: number;
  isComplete: boolean;
  documents: Array<{
    documentTypeId: string;
    nameFr: string;
    isRequired: boolean;
    status: string; // 'VALIDATED', 'PENDING_REVIEW', 'REPLACEMENT_REQUIRED', 'REJECTED', 'MISSING'
    currentDocumentId?: string;
    versionNumber?: number;
    originalFilename?: string;
    publicReplacementMessage?: string | null;
  }>;
}

export class DocumentService {
  /**
   * Resolves active document requirements with deterministic 3-tier hierarchy precedence:
   * Level specific > Cycle specific > School global.
   */
  static async resolveRequirements(
    schoolId?: string | null,
    academicYearId?: string | null,
    levelId?: string | null,
    cycleId?: string | null,
    choiceId?: string | null
  ): Promise<DocumentRequirementDto[]> {
    const db = getDb();

    let resolvedAcademicYearId = academicYearId;
    if (!resolvedAcademicYearId) {
      try {
        const activeYear = await AcademicYearService.getActiveAcademicYear();
        if (activeYear?.id) {
          resolvedAcademicYearId = activeYear.id;
        }
      } catch (err) {}
    }

    // Query all active requirements
    const rows = await db
      .select({
        req: schoolLevelDocumentRequirements,
        docType: documentTypes,
      })
      .from(schoolLevelDocumentRequirements)
      .innerJoin(documentTypes, eq(schoolLevelDocumentRequirements.documentTypeId, documentTypes.id))
      .where(
        and(
          eq(schoolLevelDocumentRequirements.isActive, true),
          eq(documentTypes.isActive, true)
        )
      )
      .orderBy(asc(schoolLevelDocumentRequirements.displayOrder));

    // Group by documentTypeId prioritizing Choice > Level > Cycle > School > Global
    const requirementsMap = new Map<string, DocumentRequirementDto & { score: number }>();

    for (const row of rows) {
      const r = row.req;
      const dt = row.docType;

      // School match: applies if r.schoolId is null or matches schoolId
      if (r.schoolId && (!schoolId || r.schoolId !== schoolId)) {
        continue;
      }

      // Academic year match: applies if r.academicYearId is null or matches resolvedAcademicYearId
      if (r.academicYearId && (!resolvedAcademicYearId || r.academicYearId !== resolvedAcademicYearId)) {
        continue;
      }

      let precedenceScore = 1; // 1 = Global
      let precedenceLevel: 'CHOICE' | 'LEVEL' | 'CYCLE' | 'GLOBAL' = 'GLOBAL';

      if (choiceId && r.choiceId === choiceId) {
        precedenceScore = 5;
        precedenceLevel = 'CHOICE' as any;
      } else if (r.choiceId) {
        // Scoped to a different choice, skip
        continue;
      } else if (levelId && r.levelId === levelId) {
        precedenceScore = 4;
        precedenceLevel = 'LEVEL';
      } else if (r.levelId) {
        // Scoped to a different level, skip
        continue;
      } else if (cycleId && r.cycleId === cycleId) {
        precedenceScore = 3;
        precedenceLevel = 'CYCLE';
      } else if (r.cycleId) {
        // Scoped to a different cycle, skip
        continue;
      } else if (r.schoolId) {
        precedenceScore = 2;
      }

      const existing = requirementsMap.get(dt.id);
      if (!existing || precedenceScore >= existing.score) {
        requirementsMap.set(dt.id, {
          id: r.id,
          documentTypeId: dt.id,
          nameFr: dt.nameFr,
          nameAr: dt.nameAr,
          descriptionFr: dt.descriptionFr,
          descriptionAr: dt.descriptionAr,
          fileRuleType: dt.fileRuleType,
          maxFileSizeBytes: dt.maxFileSizeBytes || 5242880,
          maxFiles: dt.maxFiles || 1,
          isRequired: r.isRequired,
          blockSubmissionIfMissing: r.blockSubmissionIfMissing,
          showClient: r.showClient,
          isActive: r.isActive,
          displayOrder: r.displayOrder,
          precedenceLevel: precedenceLevel,
          score: precedenceScore,
        });
      }
    }

    return Array.from(requirementsMap.values()).map(({ score, ...req }) => req);
  }

  /**
   * Returns public-safe document requirements for client registration forms.
   */
  static async getPublicRequirementsForSchoolYearLevel(schoolYearLevelId: string) {
    const db = getDb();
    const [syl] = await db
      .select({
        syl: schoolYearLevels,
        level: levels,
      })
      .from(schoolYearLevels)
      .innerJoin(levels, eq(schoolYearLevels.levelId, levels.id))
      .where(eq(schoolYearLevels.id, schoolYearLevelId));

    if (!syl) {
      throw new AppError('NOT_FOUND', 'Configuration de niveau introuvable.');
    }

    let requirements = await this.resolveRequirements(
      syl.syl.schoolId,
      syl.syl.academicYearId,
      syl.syl.levelId,
      syl.level.cycleId,
      syl.syl.choiceId
    );

    // Return strictly real active and client-visible requirements (NO hardcoded fallback)
    return requirements
      .filter((r) => r.isActive && r.showClient)
      .map((r) => ({
        documentTypeId: r.documentTypeId,
        nameFr: r.nameFr,
        nameAr: r.nameAr,
        descriptionFr: r.descriptionFr,
        descriptionAr: r.descriptionAr,
        fileRuleType: r.fileRuleType,
        maxFileSizeBytes: r.maxFileSizeBytes,
        maxFiles: r.maxFiles,
        isRequired: r.isRequired,
        blockSubmissionIfMissing: r.blockSubmissionIfMissing,
        displayOrder: r.displayOrder,
      }));
  }

  /**
   * Uploads a private registration document with immutable versioning.
   */
  static async uploadDocument(
    registrationId: string,
    documentTypeId: string,
    file: DocumentUploadInput,
    uploadedByType: 'PARENT' | 'ADMIN' = 'PARENT',
    uploadedByUserId?: string
  ) {
    const db = getDb();

    // 1. Verify registration
    const [reg] = await db.select().from(registrations).where(eq(registrations.id, registrationId));
    if (!reg) throw new AppError('NOT_FOUND', 'Dossier d’inscription introuvable.');

    // 2. Verify document type
    const [docType] = await db.select().from(documentTypes).where(eq(documentTypes.id, documentTypeId));
    if (!docType || !docType.isActive) {
      throw new AppError('VALIDATION_ERROR', 'Type de document invalide ou inactif.');
    }

    // 3. Validate file type / MIME
    const allowedMimeTypes = ['application/pdf'];
    if (docType.fileRuleType === 'IMAGE' || docType.fileRuleType === 'IMAGE_OR_PDF' || docType.fileRuleType === 'ANY') {
      allowedMimeTypes.push('image/jpeg', 'image/png', 'image/jpg');
    }

    if (!allowedMimeTypes.includes(file.mimeType.toLowerCase())) {
      throw new AppError(
        'VALIDATION_ERROR',
        `Format de fichier non autorisé. Formats acceptés : ${allowedMimeTypes.join(', ')}.`
      );
    }

    // 4. Validate file size
    const maxSizeBytes = docType.maxFileSizeBytes || 5242880; // default 5MB
    if (file.sizeBytes > maxSizeBytes) {
      const maxMb = Math.round(maxSizeBytes / (1024 * 1024));
      throw new AppError('VALIDATION_ERROR', `Le fichier dépasse la taille maximale autorisée (${maxMb} Mo).`);
    }

    // 5. Query existing latest version
    const [latestVersion] = await db
      .select()
      .from(registrationDocuments)
      .where(
        and(
          eq(registrationDocuments.registrationId, registrationId),
          eq(registrationDocuments.documentTypeId, documentTypeId)
        )
      )
      .orderBy(desc(registrationDocuments.versionNumber));

    const newVersionNumber = (latestVersion?.versionNumber || 0) + 1;
    const extension = file.mimeType.includes('pdf') ? 'pdf' : file.originalFilename.split('.').pop() || 'dat';

    // 6. Build secure storage key
    const storageKey = StorageService.buildDocumentStorageKey(
      registrationId,
      documentTypeId,
      newVersionNumber,
      extension
    );

    // 7. Store private file
    await StorageService.uploadPrivate(storageKey, file.buffer, file.mimeType);

    const now = new Date();

    // 8. Insert record
    const [insertedDoc] = await db
      .insert(registrationDocuments)
      .values({
        registrationId,
        documentTypeId,
        storageKey,
        originalFilename: file.originalFilename.trim(),
        mimeType: file.mimeType,
        fileSizeBytes: file.sizeBytes,
        status: 'PENDING_REVIEW',
        versionNumber: newVersionNumber,
        uploadedAt: now,
        uploadedByType,
        uploadedByUserId: uploadedByUserId || null,
        replacesDocumentId: latestVersion?.id || null,
      })
      .returning();

    await db.insert(auditLogs).values({
      userId: uploadedByUserId || null,
      action: 'DOCUMENT_UPLOADED',
      module: 'DOCUMENTS',
      entityType: 'REGISTRATION_DOCUMENT',
      entityId: insertedDoc.id,
      schoolId: reg.schoolId,
      afterJson: {
        registrationId,
        documentTypeId,
        versionNumber: newVersionNumber,
        filename: file.originalFilename,
      },
      result: 'SUCCESS',
    });

    return insertedDoc;
  }

  /**
   * Returns documents review queue (PENDING_REVIEW / REPLACEMENT_REQUIRED) with school-scoped access.
   */
  static async getDocumentReviewQueue(
    actor: User,
    filters?: { schoolId?: string; status?: string; search?: string }
  ) {
    if (!AuthGuard.hasPermission(actor, 'document.read')) {
      throw new AppError('FORBIDDEN', 'Permission refusée pour consulter les documents.');
    }

    const db = getDb();
    let query = db
      .select({
        doc: registrationDocuments,
        docType: documentTypes,
        reg: registrations,
        student: students,
        parent: parents,
        school: schools,
        level: levels,
      })
      .from(registrationDocuments)
      .innerJoin(documentTypes, eq(registrationDocuments.documentTypeId, documentTypes.id))
      .innerJoin(registrations, eq(registrationDocuments.registrationId, registrations.id))
      .innerJoin(students, eq(registrations.studentId, students.id))
      .innerJoin(parents, eq(registrations.parentId, parents.id))
      .innerJoin(schools, eq(registrations.schoolId, schools.id))
      .innerJoin(levels, eq(registrations.levelId, levels.id))
      .orderBy(asc(registrationDocuments.uploadedAt));

    const rows = await query;
    let filtered = rows;

    if (actor.role !== 'SUPER_ADMIN') {
      filtered = filtered.filter((r) =>
        actor.allowedSchoolIds && actor.allowedSchoolIds.includes(r.reg.schoolId)
      );
    }

    if (filters?.schoolId) {
      filtered = filtered.filter((r) => r.reg.schoolId === filters.schoolId);
    }

    if (filters?.status) {
      filtered = filtered.filter((r) => r.doc.status === filters.status);
    } else {
      // Default queue: pending review
      filtered = filtered.filter((r) => ['PENDING_REVIEW', 'REPLACEMENT_REQUIRED'].includes(r.doc.status));
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.reg.registrationCode.toLowerCase().includes(q) ||
          r.student.fullName.toLowerCase().includes(q) ||
          r.docType.nameFr.toLowerCase().includes(q)
      );
    }

    return filtered.map((r) => ({
      id: r.doc.id,
      registrationId: r.reg.id,
      registrationCode: r.reg.registrationCode,
      documentTypeId: r.docType.id,
      documentTypeNameFr: r.docType.nameFr,
      studentFullName: r.student.fullName,
      parentFullName: r.parent.fullName,
      schoolName: r.school.name,
      levelNameFr: r.level.nameFr,
      originalFilename: r.doc.originalFilename,
      mimeType: r.doc.mimeType,
      fileSizeBytes: r.doc.fileSizeBytes,
      status: r.doc.status,
      versionNumber: r.doc.versionNumber,
      uploadedAt: r.doc.uploadedAt,
      publicReplacementMessage: r.doc.publicReplacementMessage,
    }));
  }

  /**
   * Returns document detail with full version history chain.
   */
  static async getDocumentDetail(actor: User, documentId: string) {
    if (!AuthGuard.hasPermission(actor, 'document.read')) {
      throw new AppError('FORBIDDEN', 'Permission refusée.');
    }

    const db = getDb();
    const [docRow] = await db
      .select({
        doc: registrationDocuments,
        docType: documentTypes,
        reg: registrations,
        student: students,
        parent: parents,
        school: schools,
        level: levels,
      })
      .from(registrationDocuments)
      .innerJoin(documentTypes, eq(registrationDocuments.documentTypeId, documentTypes.id))
      .innerJoin(registrations, eq(registrationDocuments.registrationId, registrations.id))
      .innerJoin(students, eq(registrations.studentId, students.id))
      .innerJoin(parents, eq(registrations.parentId, parents.id))
      .innerJoin(schools, eq(registrations.schoolId, schools.id))
      .innerJoin(levels, eq(registrations.levelId, levels.id))
      .where(eq(registrationDocuments.id, documentId));

    if (!docRow) throw new AppError('NOT_FOUND', 'Document introuvable.');

    if (!AuthGuard.canAccessSchool(actor, docRow.reg.schoolId)) {
      throw new AppError('FORBIDDEN', 'Accès refusé pour cet établissement.');
    }

    // Fetch all versions of this document for this registration
    const allVersions = await db
      .select()
      .from(registrationDocuments)
      .where(
        and(
          eq(registrationDocuments.registrationId, docRow.reg.id),
          eq(registrationDocuments.documentTypeId, docRow.docType.id)
        )
      )
      .orderBy(desc(registrationDocuments.versionNumber));

    return {
      document: {
        id: docRow.doc.id,
        documentTypeId: docRow.docType.id,
        documentTypeNameFr: docRow.docType.nameFr,
        originalFilename: docRow.doc.originalFilename,
        mimeType: docRow.doc.mimeType,
        fileSizeBytes: docRow.doc.fileSizeBytes,
        status: docRow.doc.status,
        versionNumber: docRow.doc.versionNumber,
        uploadedAt: docRow.doc.uploadedAt,
        reviewedAt: docRow.doc.reviewedAt,
        rejectionReasonCode: docRow.doc.rejectionReasonCode,
        publicReplacementMessage: docRow.doc.publicReplacementMessage,
      },
      registration: {
        id: docRow.reg.id,
        code: docRow.reg.registrationCode,
        studentFullName: docRow.student.fullName,
        schoolName: docRow.school.name,
        levelNameFr: docRow.level.nameFr,
      },
      versionHistory: allVersions.map((v) => ({
        id: v.id,
        versionNumber: v.versionNumber,
        originalFilename: v.originalFilename,
        status: v.status,
        uploadedAt: v.uploadedAt,
        reviewedAt: v.reviewedAt,
        rejectionReasonCode: v.rejectionReasonCode,
      })),
    };
  }

  /**
   * Generates a secure temporary preview URL (15 minutes).
   */
  static async getSecurePreviewUrl(actor: User, documentId: string) {
    if (!AuthGuard.hasPermission(actor, 'document.read')) {
      throw new AppError('FORBIDDEN', 'Permission refusée.');
    }

    const db = getDb();
    const [doc] = await db
      .select({
        doc: registrationDocuments,
        reg: registrations,
      })
      .from(registrationDocuments)
      .innerJoin(registrations, eq(registrationDocuments.registrationId, registrations.id))
      .where(eq(registrationDocuments.id, documentId));

    if (!doc) throw new AppError('NOT_FOUND', 'Document introuvable.');

    if (!AuthGuard.canAccessSchool(actor, doc.reg.schoolId)) {
      throw new AppError('FORBIDDEN', 'Accès refusé pour cet établissement.');
    }

    const previewUrl = StorageService.createTemporarySignedUrl(
      doc.doc.id,
      doc.doc.storageKey,
      'preview',
      doc.doc.originalFilename,
      900 // 15 mins
    );

    return { previewUrl, expiresInSeconds: 900 };
  }

  /**
   * Generates a secure temporary download URL (15 minutes).
   */
  static async getSecureDownloadUrl(actor: User, documentId: string) {
    if (!AuthGuard.hasPermission(actor, 'document.read')) {
      throw new AppError('FORBIDDEN', 'Permission refusée.');
    }

    const db = getDb();
    const [doc] = await db
      .select({
        doc: registrationDocuments,
        reg: registrations,
      })
      .from(registrationDocuments)
      .innerJoin(registrations, eq(registrationDocuments.registrationId, registrations.id))
      .where(eq(registrationDocuments.id, documentId));

    if (!doc) throw new AppError('NOT_FOUND', 'Document introuvable.');

    if (!AuthGuard.canAccessSchool(actor, doc.reg.schoolId)) {
      throw new AppError('FORBIDDEN', 'Accès refusé pour cet établissement.');
    }

    const downloadUrl = StorageService.createTemporarySignedUrl(
      doc.doc.id,
      doc.doc.storageKey,
      'download',
      doc.doc.originalFilename,
      900 // 15 mins
    );

    return { downloadUrl, expiresInSeconds: 900 };
  }

  /**
   * Validates a document.
   */
  static async validateDocument(actor: User, documentId: string) {
    if (!AuthGuard.hasPermission(actor, 'document.validate')) {
      throw new AppError('FORBIDDEN', 'Permission refusée pour valider les documents.');
    }

    const db = getDb();
    const [doc] = await db
      .select({
        doc: registrationDocuments,
        reg: registrations,
      })
      .from(registrationDocuments)
      .innerJoin(registrations, eq(registrationDocuments.registrationId, registrations.id))
      .where(eq(registrationDocuments.id, documentId));

    if (!doc) throw new AppError('NOT_FOUND', 'Document introuvable.');

    if (!AuthGuard.canAccessSchool(actor, doc.reg.schoolId)) {
      throw new AppError('FORBIDDEN', 'Accès refusé pour cet établissement.');
    }

    const now = new Date();
    const [updated] = await db
      .update(registrationDocuments)
      .set({
        status: 'VALIDATED',
        reviewedByUserId: actor.id,
        reviewedAt: now,
        rejectionReasonCode: null,
        publicReplacementMessage: null,
        updatedAt: now,
      })
      .where(eq(registrationDocuments.id, documentId))
      .returning();

    await db.insert(auditLogs).values({
      userId: actor.id,
      action: 'DOCUMENT_VALIDATED',
      module: 'DOCUMENTS',
      entityType: 'REGISTRATION_DOCUMENT',
      entityId: documentId,
      schoolId: doc.reg.schoolId,
      result: 'SUCCESS',
    });

    return updated;
  }

  /**
   * Rejects a document.
   */
  static async rejectDocument(
    actor: User,
    documentId: string,
    reasonCode: 'UNREADABLE' | 'INCOMPLETE' | 'WRONG_DOCUMENT' | 'EXPIRED' | 'INVALID_INFORMATION' | 'OTHER',
    internalComment?: string
  ) {
    if (!AuthGuard.hasPermission(actor, 'document.validate')) {
      throw new AppError('FORBIDDEN', 'Permission refusée.');
    }

    const db = getDb();
    const [doc] = await db
      .select({ doc: registrationDocuments, reg: registrations })
      .from(registrationDocuments)
      .innerJoin(registrations, eq(registrationDocuments.registrationId, registrations.id))
      .where(eq(registrationDocuments.id, documentId));

    if (!doc) throw new AppError('NOT_FOUND', 'Document introuvable.');

    if (!AuthGuard.canAccessSchool(actor, doc.reg.schoolId)) {
      throw new AppError('FORBIDDEN', 'Accès refusé pour cet établissement.');
    }

    const now = new Date();
    const [updated] = await db
      .update(registrationDocuments)
      .set({
        status: 'REJECTED',
        rejectionReasonCode: reasonCode,
        reviewedByUserId: actor.id,
        reviewedAt: now,
        updatedAt: now,
      })
      .where(eq(registrationDocuments.id, documentId))
      .returning();

    await db.insert(auditLogs).values({
      userId: actor.id,
      action: 'DOCUMENT_REJECTED',
      module: 'DOCUMENTS',
      entityType: 'REGISTRATION_DOCUMENT',
      entityId: documentId,
      schoolId: doc.reg.schoolId,
      afterJson: { reasonCode, internalComment },
      result: 'SUCCESS',
    });

    return updated;
  }

  /**
   * Requests a document replacement with a parent-facing instruction message.
   */
  static async requestReplacement(
    actor: User,
    documentId: string,
    publicMessage: string,
    internalComment?: string
  ) {
    if (!AuthGuard.hasPermission(actor, 'document.validate')) {
      throw new AppError('FORBIDDEN', 'Permission refusée.');
    }

    const db = getDb();
    const [doc] = await db
      .select({ doc: registrationDocuments, reg: registrations })
      .from(registrationDocuments)
      .innerJoin(registrations, eq(registrationDocuments.registrationId, registrations.id))
      .where(eq(registrationDocuments.id, documentId));

    if (!doc) throw new AppError('NOT_FOUND', 'Document introuvable.');

    if (!AuthGuard.canAccessSchool(actor, doc.reg.schoolId)) {
      throw new AppError('FORBIDDEN', 'Accès refusé pour cet établissement.');
    }

    const now = new Date();
    const [updated] = await db
      .update(registrationDocuments)
      .set({
        status: 'REPLACEMENT_REQUIRED',
        publicReplacementMessage: publicMessage.trim(),
        reviewedByUserId: actor.id,
        reviewedAt: now,
        updatedAt: now,
      })
      .where(eq(registrationDocuments.id, documentId))
      .returning();

    await db.insert(auditLogs).values({
      userId: actor.id,
      action: 'DOCUMENT_REPLACEMENT_REQUESTED',
      module: 'DOCUMENTS',
      entityType: 'REGISTRATION_DOCUMENT',
      entityId: documentId,
      schoolId: doc.reg.schoolId,
      afterJson: { publicMessage, internalComment },
      result: 'SUCCESS',
    });

    return updated;
  }

  /**
   * Calculates comprehensive dossier document completeness.
   */
  static async getRegistrationDocumentCompleteness(registrationId: string): Promise<DocumentCompletenessSummary> {
    const db = getDb();

    // 1. Get registration
    const [reg] = await db
      .select({
        reg: registrations,
        level: levels,
      })
      .from(registrations)
      .innerJoin(levels, eq(registrations.levelId, levels.id))
      .where(eq(registrations.id, registrationId));

    if (!reg) {
      throw new AppError('NOT_FOUND', 'Dossier d’inscription introuvable.');
    }

    // 2. Resolve requirements
    const requirements = await this.resolveRequirements(
      reg.reg.schoolId,
      reg.reg.academicYearId,
      reg.reg.levelId,
      reg.level.cycleId
    );

    // 3. Query all uploaded documents for this registration
    const uploadedDocs = await db
      .select()
      .from(registrationDocuments)
      .where(eq(registrationDocuments.registrationId, registrationId))
      .orderBy(desc(registrationDocuments.versionNumber));

    // Map latest version per documentTypeId
    const latestDocMap = new Map<string, typeof registrationDocuments.$inferSelect>();
    for (const doc of uploadedDocs) {
      if (!latestDocMap.has(doc.documentTypeId)) {
        latestDocMap.set(doc.documentTypeId, doc);
      }
    }

    let requiredCount = 0;
    let requiredProvidedCount = 0;
    let requiredValidatedCount = 0;
    let missingRequiredCount = 0;
    let pendingRequiredCount = 0;
    let replacementRequiredCount = 0;
    let optionalProvidedCount = 0;

    const docItems: DocumentCompletenessSummary['documents'] = [];

    for (const req of requirements) {
      const latestDoc = latestDocMap.get(req.documentTypeId);

      if (req.isRequired) {
        requiredCount++;
        if (latestDoc) {
          requiredProvidedCount++;
          if (latestDoc.status === 'VALIDATED') {
            requiredValidatedCount++;
          } else if (latestDoc.status === 'PENDING_REVIEW' || latestDoc.status === 'UPLOADED') {
            pendingRequiredCount++;
          } else if (latestDoc.status === 'REPLACEMENT_REQUIRED' || latestDoc.status === 'REJECTED') {
            replacementRequiredCount++;
          }
        } else {
          missingRequiredCount++;
        }
      } else {
        if (latestDoc) {
          optionalProvidedCount++;
        }
      }

      docItems.push({
        documentTypeId: req.documentTypeId,
        nameFr: req.nameFr,
        isRequired: req.isRequired,
        status: latestDoc ? latestDoc.status : (req.isRequired ? 'MISSING' : 'NOT_PROVIDED'),
        currentDocumentId: latestDoc?.id,
        versionNumber: latestDoc?.versionNumber,
        originalFilename: latestDoc?.originalFilename,
        publicReplacementMessage: latestDoc?.publicReplacementMessage,
      });
    }

    // Complete if zero missing, zero pending, zero replacement required among mandatory docs
    const isComplete =
      requiredCount === 0 ||
      (missingRequiredCount === 0 && pendingRequiredCount === 0 && replacementRequiredCount === 0 && requiredValidatedCount === requiredCount);

    return {
      registrationId,
      requiredCount,
      requiredProvidedCount,
      requiredValidatedCount,
      missingRequiredCount,
      pendingRequiredCount,
      replacementRequiredCount,
      optionalProvidedCount,
      isComplete,
      documents: docItems,
    };
  }

  /**
   * Verifies that document requirements allow registration acceptance.
   */
  static async checkAcceptanceAllowed(registrationId: string, override = false, overrideReason?: string, actor?: User) {
    if (override) {
      if (actor && !AuthGuard.isSuperAdmin(actor)) {
        throw new AppError('FORBIDDEN', 'Seul le Super Administrateur peut forcer l’acceptation avec des documents manquants.');
      }
      if (actor) {
        const db = getDb();
        await db.insert(auditLogs).values({
          userId: actor.id,
          action: 'ACCEPTANCE_OVERRIDE_DOCUMENTS',
          module: 'REGISTRATIONS',
          entityType: 'REGISTRATION',
          entityId: registrationId,
          afterJson: { overrideReason },
          result: 'SUCCESS',
        });
      }
      return true;
    }

    const completeness = await this.getRegistrationDocumentCompleteness(registrationId);
    if (!completeness.isComplete) {
      throw new AppError(
        'VALIDATION_ERROR',
        `Le dossier est incomplet : ${completeness.missingRequiredCount} document(s) obligatoire(s) manquant(s), ${completeness.pendingRequiredCount} en attente de vérification, ${completeness.replacementRequiredCount} à remplacer.`
      );
    }

    return true;
  }

  /**
   * Client tracking replacement upload flow.
   */
  static async clientReplaceDocument(
    trackingToken: string,
    documentTypeId: string,
    file: DocumentUploadInput
  ) {
    const db = getDb();
    const [reg] = await db
      .select()
      .from(registrations)
      .where(or(eq(registrations.registrationCode, trackingToken), eq(registrations.id, trackingToken)));

    if (!reg) {
      throw new AppError('NOT_FOUND', 'Session de suivi invalide ou introuvable.');
    }

    // Verify document requirement exists
    const [latestDoc] = await db
      .select()
      .from(registrationDocuments)
      .where(
        and(
          eq(registrationDocuments.registrationId, reg.id),
          eq(registrationDocuments.documentTypeId, documentTypeId)
        )
      )
      .orderBy(desc(registrationDocuments.versionNumber));

    // Upload new version
    return this.uploadDocument(reg.id, documentTypeId, file, 'PARENT');
  }

  // ── Document Types CRUD ──
  static async getAllDocumentTypes(actor?: User) {
    const db = getDb();
    return db.select().from(documentTypes).orderBy(asc(documentTypes.nameFr));
  }

  static async createDocumentType(actor: User, payload: {
    nameFr: string;
    nameAr?: string;
    descriptionFr?: string;
    descriptionAr?: string;
    fileRuleType?: 'IMAGE' | 'PDF' | 'IMAGE_OR_PDF' | 'ANY';
    maxFileSizeBytes?: number;
    maxFiles?: number;
    isActive?: boolean;
  }) {
    if (!AuthGuard.hasPermission(actor, 'document.validate') && !AuthGuard.isSuperAdmin(actor)) {
      throw new AppError('FORBIDDEN', 'Permission refusée.');
    }
    const db = getDb();
    const [created] = await db
      .insert(documentTypes)
      .values({
        nameFr: payload.nameFr.trim(),
        nameAr: payload.nameAr?.trim() || null,
        descriptionFr: payload.descriptionFr?.trim() || null,
        descriptionAr: payload.descriptionAr?.trim() || null,
        fileRuleType: payload.fileRuleType || 'IMAGE_OR_PDF',
        maxFileSizeBytes: payload.maxFileSizeBytes || 5242880,
        maxFiles: payload.maxFiles || 1,
        isActive: payload.isActive !== undefined ? payload.isActive : true,
      })
      .returning();

    await db.insert(auditLogs).values({
      userId: actor.id,
      action: 'DOCUMENT_TYPE_CREATED',
      module: 'DOCUMENTS',
      entityType: 'DOCUMENT_TYPE',
      entityId: created.id,
      afterJson: created,
      result: 'SUCCESS',
    });

    return created;
  }

  static async updateDocumentType(actor: User, id: string, payload: Partial<{
    nameFr: string;
    nameAr: string;
    descriptionFr: string;
    descriptionAr: string;
    fileRuleType: 'IMAGE' | 'PDF' | 'IMAGE_OR_PDF' | 'ANY';
    maxFileSizeBytes: number;
    maxFiles: number;
    isActive: boolean;
  }>) {
    if (!AuthGuard.hasPermission(actor, 'document.validate') && !AuthGuard.isSuperAdmin(actor)) {
      throw new AppError('FORBIDDEN', 'Permission refusée.');
    }
    const db = getDb();
    const updateValues: any = { updatedAt: new Date() };
    if (payload.nameFr !== undefined) updateValues.nameFr = payload.nameFr.trim();
    if (payload.nameAr !== undefined) updateValues.nameAr = payload.nameAr.trim();
    if (payload.descriptionFr !== undefined) updateValues.descriptionFr = payload.descriptionFr;
    if (payload.descriptionAr !== undefined) updateValues.descriptionAr = payload.descriptionAr;
    if (payload.fileRuleType !== undefined) updateValues.fileRuleType = payload.fileRuleType;
    if (payload.maxFileSizeBytes !== undefined) updateValues.maxFileSizeBytes = payload.maxFileSizeBytes;
    if (payload.maxFiles !== undefined) updateValues.maxFiles = payload.maxFiles;
    if (payload.isActive !== undefined) updateValues.isActive = payload.isActive;

    const [updated] = await db
      .update(documentTypes)
      .set(updateValues)
      .where(eq(documentTypes.id, id))
      .returning();

    return updated;
  }

  static async deleteDocumentType(actor: User, id: string) {
    if (!AuthGuard.hasPermission(actor, 'document.validate') && !AuthGuard.isSuperAdmin(actor)) {
      throw new AppError('FORBIDDEN', 'Permission refusée.');
    }
    const db = getDb();
    const [docCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(registrationDocuments)
      .where(eq(registrationDocuments.documentTypeId, id));

    if ((docCount?.count || 0) > 0) {
      const [deactivated] = await db
        .update(documentTypes)
        .set({ isActive: false, updatedAt: new Date() })
        .where(eq(documentTypes.id, id))
        .returning();
      return { id, deactivated: true, message: 'Type de document désactivé car des pièces justificatives y sont rattachées.' };
    }

    await db.delete(schoolLevelDocumentRequirements).where(eq(schoolLevelDocumentRequirements.documentTypeId, id));
    await db.delete(documentTypes).where(eq(documentTypes.id, id));
    return { id, deleted: true, message: 'Type de document supprimé avec succès.' };
  }

  // ── Document Requirements CRUD ──
  static async getRequirementsAdmin(actor: User, filter?: { schoolId?: string; academicYearId?: string; levelId?: string; cycleId?: string; choiceId?: string }) {
    const db = getDb();
    let query = db
      .select({
        id: schoolLevelDocumentRequirements.id,
        schoolId: schoolLevelDocumentRequirements.schoolId,
        academicYearId: schoolLevelDocumentRequirements.academicYearId,
        levelId: schoolLevelDocumentRequirements.levelId,
        cycleId: schoolLevelDocumentRequirements.cycleId,
        choiceId: schoolLevelDocumentRequirements.choiceId,
        documentTypeId: schoolLevelDocumentRequirements.documentTypeId,
        isRequired: schoolLevelDocumentRequirements.isRequired,
        blockSubmissionIfMissing: schoolLevelDocumentRequirements.blockSubmissionIfMissing,
        showClient: schoolLevelDocumentRequirements.showClient,
        isActive: schoolLevelDocumentRequirements.isActive,
        status: schoolLevelDocumentRequirements.status,
        displayOrder: schoolLevelDocumentRequirements.displayOrder,
        docTypeNameFr: documentTypes.nameFr,
        docTypeNameAr: documentTypes.nameAr,
        docTypeDescriptionFr: documentTypes.descriptionFr,
        fileRuleType: documentTypes.fileRuleType,
        maxFileSizeBytes: documentTypes.maxFileSizeBytes,
        schoolName: schools.name,
        schoolShortName: schools.shortName,
        levelName: levels.nameFr,
        academicYearName: academicYears.name,
        choiceName: levelChoices.nameFr,
      })
      .from(schoolLevelDocumentRequirements)
      .innerJoin(documentTypes, eq(schoolLevelDocumentRequirements.documentTypeId, documentTypes.id))
      .leftJoin(schools, eq(schoolLevelDocumentRequirements.schoolId, schools.id))
      .leftJoin(levels, eq(schoolLevelDocumentRequirements.levelId, levels.id))
      .leftJoin(academicYears, eq(schoolLevelDocumentRequirements.academicYearId, academicYears.id))
      .leftJoin(levelChoices, eq(schoolLevelDocumentRequirements.choiceId, levelChoices.id));

    const conditions = [];
    if (filter?.schoolId) conditions.push(eq(schoolLevelDocumentRequirements.schoolId, filter.schoolId));
    if (filter?.academicYearId) conditions.push(eq(schoolLevelDocumentRequirements.academicYearId, filter.academicYearId));
    if (filter?.levelId) conditions.push(eq(schoolLevelDocumentRequirements.levelId, filter.levelId));
    if (filter?.cycleId) conditions.push(eq(schoolLevelDocumentRequirements.cycleId, filter.cycleId));
    if (filter?.choiceId) conditions.push(eq(schoolLevelDocumentRequirements.choiceId, filter.choiceId));

    if (conditions.length > 0) {
      return query.where(and(...conditions)).orderBy(asc(schoolLevelDocumentRequirements.displayOrder));
    }

    return query.orderBy(asc(schoolLevelDocumentRequirements.displayOrder));
  }

  static async createDocumentRequirement(actor: User, payload: {
    schoolId?: string | null;
    academicYearId?: string | null;
    documentTypeId: string;
    levelId?: string | null;
    cycleId?: string | null;
    choiceId?: string | null;
    isRequired?: boolean;
    blockSubmissionIfMissing?: boolean;
    showClient?: boolean;
    isActive?: boolean;
    status?: string;
    displayOrder?: number;
  }) {
    if (!AuthGuard.hasPermission(actor, 'document.validate') && !AuthGuard.isSuperAdmin(actor)) {
      throw new AppError('FORBIDDEN', 'Permission refusée.');
    }

    if (!payload.documentTypeId || !payload.documentTypeId.trim()) {
      throw new AppError('VALIDATION_ERROR', 'Le type de document (documentTypeId) est obligatoire.');
    }

    const isReq = payload.isRequired !== undefined ? payload.isRequired : true;
    const showCl = payload.showClient !== undefined ? payload.showClient : true;

    if (showCl === false && isReq === true) {
      throw new AppError('BAD_REQUEST', 'Un document masqué côté client ne peut pas être obligatoire.');
    }

    const targetSchoolId = payload.schoolId && payload.schoolId.trim() ? payload.schoolId.trim() : null;
    let targetAcademicYearId = payload.academicYearId && payload.academicYearId.trim() ? payload.academicYearId.trim() : null;

    if (!targetAcademicYearId) {
      try {
        const activeYear = await AcademicYearService.getActiveAcademicYear();
        if (activeYear?.id) {
          targetAcademicYearId = activeYear.id;
        }
      } catch (err) {}
    }

    const db = getDb();
    const [created] = await db
      .insert(schoolLevelDocumentRequirements)
      .values({
        schoolId: targetSchoolId,
        academicYearId: targetAcademicYearId,
        documentTypeId: payload.documentTypeId.trim(),
        levelId: payload.levelId || null,
        cycleId: payload.cycleId || null,
        choiceId: payload.choiceId || null,
        isRequired: isReq,
        blockSubmissionIfMissing: payload.blockSubmissionIfMissing !== undefined ? payload.blockSubmissionIfMissing : false,
        showClient: showCl,
        isActive: payload.isActive !== undefined ? payload.isActive : true,
        status: payload.status || 'PUBLISHED',
        displayOrder: payload.displayOrder || 0,
      })
      .returning();

    return created;
  }

  static async updateDocumentRequirement(actor: User, id: string, payload: Partial<{
    isRequired: boolean;
    blockSubmissionIfMissing: boolean;
    showClient: boolean;
    isActive: boolean;
    status: string;
    displayOrder: number;
    schoolId: string | null;
    academicYearId: string | null;
    levelId: string | null;
    cycleId: string | null;
    choiceId: string | null;
    documentTypeId: string;
  }>) {
    if (!AuthGuard.hasPermission(actor, 'document.validate') && !AuthGuard.isSuperAdmin(actor)) {
      throw new AppError('FORBIDDEN', 'Permission refusée.');
    }
    const db = getDb();

    const [existing] = await db
      .select()
      .from(schoolLevelDocumentRequirements)
      .where(eq(schoolLevelDocumentRequirements.id, id));
    if (!existing) {
      throw new AppError('NOT_FOUND', 'Exigence de document introuvable.');
    }

    const nextShowClient = payload.showClient !== undefined ? payload.showClient : existing.showClient;
    const nextIsRequired = payload.isRequired !== undefined ? payload.isRequired : existing.isRequired;

    if (nextShowClient === false && nextIsRequired === true) {
      throw new AppError('BAD_REQUEST', 'Un document masqué côté client ne peut pas être obligatoire.');
    }

    const [updated] = await db
      .update(schoolLevelDocumentRequirements)
      .set({
        ...payload,
        updatedAt: new Date(),
      })
      .where(eq(schoolLevelDocumentRequirements.id, id))
      .returning();

    return updated;
  }

  static async deleteDocumentRequirement(actor: User, id: string) {
    if (!AuthGuard.hasPermission(actor, 'document.validate') && !AuthGuard.isSuperAdmin(actor)) {
      throw new AppError('FORBIDDEN', 'Permission refusée.');
    }
    const db = getDb();
    await db.delete(schoolLevelDocumentRequirements).where(eq(schoolLevelDocumentRequirements.id, id));
    return { id, deleted: true, message: 'Exigence de document supprimée avec succès.' };
  }
}
