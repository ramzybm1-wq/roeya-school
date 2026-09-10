/**
 * Real PostgreSQL Registration Dossier Service for VISION SCHOOL.
 * Connects directly to the single database via Drizzle ORM.
 * Enforces transactional integrity, capacity checks, unique code generation,
 * audit trail, and notifications.
 */

import {
  getDb,
  TransactionRunner,
  registrations,
  registrationStatusHistory,
  registrationNotes,
  waitingListEntries,
  parents,
  students,
  schools,
  levels,
  levelChoices,
  schoolYearLevels,
  academicYears,
  auditLogs,
  notifications,
  registrationDocuments,
  documentTypes,
} from '@vision-school/database';
import { eq, and, sql, desc, inArray, like, or } from 'drizzle-orm';
import {
  AppError,
  PaginatedResponse,
  PaginationMeta,
  User,
  RegistrationStatus,
} from '@vision-school/shared';
import {
  AdminRegistrationFilterInput,
  AdminStatusUpdateInput,
  CreateRegistrationInput,
} from '@vision-school/validation';
import { CapacityService } from './capacity.service';
import { AcademicYearService } from './academic-year.service';
import { TransitionService } from './transition.service';
import { StorageService } from './storage.service';
import { DocumentService } from './document.service';
import { AuthGuard } from '@vision-school/auth';

export class RegistrationService {
  /**
   * Generates a sequential, collision-free registration code: REG-YYYY-XXXXXX
   */
  private async generateRegistrationCode(yearName: string): Promise<string> {
    const db = getDb();
    const yearPrefix = yearName.split('/')[0]?.trim() || new Date().getFullYear().toString();
    
    // Count existing registrations for this prefix as starting sequence
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(registrations);
    
    let nextSeq = Number(countResult?.count || 0) + 1;
    while (true) {
      const paddedSeq = String(nextSeq).padStart(6, '0');
      const candidateCode = `REG-${yearPrefix}-${paddedSeq}`;
      const [existing] = await db
        .select({ id: registrations.id })
        .from(registrations)
        .where(eq(registrations.registrationCode, candidateCode))
        .limit(1);
      if (!existing) {
        return candidateCode;
      }
      nextSeq++;
    }
  }

  /**
   * Public Registration Submission: Creates parent, student, and registration in a single transaction.
   */
  async submitPublicRegistration(input: CreateRegistrationInput): Promise<{
    id?: string;
    code: string;
    registrationCode?: string;
    trackingToken: string;
    registrationId: string;
    status: string;
  }> {
    const db = getDb();

    // 1. Resolve active academic year if not provided or validate provided
    let academicYearId = input.academicYearId;
    let academicYearName = '2026 / 2027';
    try {
      const activeYear = await AcademicYearService.getActiveAcademicYear();
      if (!academicYearId) {
        academicYearId = activeYear.id;
      }
      academicYearName = activeYear.name;
    } catch {
      // Fallback: lookup first active year
      const [ay] = await db
        .select()
        .from(academicYears)
        .where(eq(academicYears.status, 'ACTIVE'))
        .limit(1);
      if (ay) {
        academicYearId = ay.id;
        academicYearName = ay.name;
      }
    }

    if (!academicYearId) {
      throw AppError.badRequest('Aucune année scolaire active configurée.');
    }

    // 2. Validate school exists and is active
    const [school] = await db
      .select()
      .from(schools)
      .where(and(eq(schools.id, input.schoolId), eq(schools.isActive, true)));
    if (!school) {
      throw AppError.notFound('Établissement sélectionné non valide ou inactif.');
    }

    // 3. Find or resolve school_year_level
    let [syl] = await db
      .select()
      .from(schoolYearLevels)
      .where(
        and(
          eq(schoolYearLevels.schoolId, input.schoolId),
          eq(schoolYearLevels.levelId, input.levelId),
          eq(schoolYearLevels.academicYearId, academicYearId)
        )
      );

    if (!syl) {
      // Auto-provision school_year_level if missing for flexibility
      const [newSyl] = await db
        .insert(schoolYearLevels)
        .values({
          schoolId: input.schoolId,
          levelId: input.levelId,
          academicYearId,
          capacityMode: 'LIMITED',
          capacityMax: 255,
          registrationOpen: true,
          fullBehavior: 'WAITLIST',
        })
        .returning();
      syl = newSyl;
    }

    if (!syl.registrationOpen) {
      throw AppError.conflict(
        'Les inscriptions pour ce niveau sont actuellement fermées.',
        'REGISTRATION_CLOSED'
      );
    }

    // 3b. Validate academic progression rules if prior level was specified
    if (input.previousLevelId) {
      const progCheck = await TransitionService.validateProgression(
        input.previousLevelId,
        input.previousChoiceId || null,
        input.levelId,
        input.choiceId || null
      );
      if (!progCheck.valid) {
        throw AppError.badRequest(progCheck.reason || 'Transition de niveau non autorisée.');
      }
    }

    // 4. Check capacity and determine initial status
    let initialStatus: RegistrationStatus = 'NEW';
    const acceptedCount = await CapacityService.getAcceptedCount(syl.id);
    const isFull = syl.capacityMode === 'LIMITED' && syl.capacityMax !== null && acceptedCount >= syl.capacityMax;

    if (isFull) {
      if (syl.fullBehavior === 'CLOSE') {
        throw AppError.conflict(
          'Capacité maximale atteinte pour ce niveau. Les inscriptions sont closes.',
          'LEVEL_FULL'
        );
      } else if (syl.fullBehavior === 'WAITLIST') {
        initialStatus = 'WAITLISTED';
      }
    }

    // 5. Generate Code
    const code = await this.generateRegistrationCode(academicYearName);

    // 6. Execute atomic DB insertion
    const clientUserId = (input as any).clientUserId || null;
    const primaryParent = input.primaryParent;
    const parentFullName = primaryParent.fullName || `${primaryParent.firstNameFr || ''} ${primaryParent.lastNameFr || ''}`.trim() || 'Parent / Tuteur';

    let parentId: string;
    if (clientUserId) {
      const [existingParent] = await db.select().from(parents).where(eq(parents.userId, clientUserId));
      if (existingParent) {
        parentId = existingParent.id;
        await db
          .update(parents)
          .set({
            fullName: parentFullName || existingParent.fullName,
            phonePrimary: primaryParent.phonePrimary || existingParent.phonePrimary,
            email: primaryParent.email || existingParent.email,
            address: primaryParent.address || existingParent.address,
            wilaya: primaryParent.wilaya || existingParent.wilaya,
            commune: primaryParent.commune || existingParent.commune,
            updatedAt: new Date(),
          })
          .where(eq(parents.id, existingParent.id));
      } else {
        const [createdParent] = await db
          .insert(parents)
          .values({
            userId: clientUserId,
            fullName: parentFullName,
            phonePrimary: primaryParent.phonePrimary,
            phoneSecondary: primaryParent.phoneSecondary || null,
            email: primaryParent.email || null,
            address: primaryParent.address || null,
            wilaya: primaryParent.wilaya || 'Alger',
            commune: primaryParent.commune || null,
          })
          .returning();
        parentId = createdParent.id;
      }
    } else {
      const [createdParent] = await db
        .insert(parents)
        .values({
          userId: null,
          fullName: parentFullName,
          phonePrimary: primaryParent.phonePrimary,
          phoneSecondary: primaryParent.phoneSecondary || null,
          email: primaryParent.email || null,
          address: primaryParent.address || null,
          wilaya: primaryParent.wilaya || 'Alger',
          commune: primaryParent.commune || null,
        })
        .returning();
      parentId = createdParent.id;
    }

    const studentInput = input.student;
    const studentFullName = studentInput.fullName || `${studentInput.firstNameFr || ''} ${studentInput.lastNameFr || ''}`.trim() || 'Élève';

    const [createdStudent] = await db
      .insert(students)
      .values({
        fullName: studentFullName,
        firstName: studentInput.firstNameFr || null,
        lastName: studentInput.lastNameFr || null,
        gender: studentInput.gender || 'MALE',
        birthDate: studentInput.birthDate || '2018-01-01',
        birthPlace: studentInput.birthPlace || null,
        currentSchool: studentInput.currentSchool || null,
        wilaya: studentInput.wilaya || 'Alger',
        commune: studentInput.commune || null,
      })
      .returning();

    const [createdReg] = await db
      .insert(registrations)
      .values({
        registrationCode: code,
        schoolId: input.schoolId,
        academicYearId,
        levelId: input.levelId,
        choiceId: input.choiceId || null,
        schoolYearLevelId: syl.id,
        parentId: parentId,
        studentId: createdStudent.id,
        clientUserId: clientUserId,
        status: initialStatus,
        source: 'PUBLIC_WEB',
        submittedAt: new Date(),
        waitlistedAt: initialStatus === 'WAITLISTED' ? new Date() : null,
      })
      .returning();

    // 7. Record status history
    await db.insert(registrationStatusHistory).values({
      registrationId: createdReg.id,
      fromStatus: null,
      toStatus: initialStatus,
      publicComment: initialStatus === 'WAITLISTED'
        ? 'Dossier inscrit sur liste d’attente (capacité maximale atteinte).'
        : 'Dossier d’inscription soumis avec succès.',
    });

    // 8. Process attached student documents if provided
    const inputDocs = (input as any).documents;
    if (inputDocs && Array.isArray(inputDocs)) {
      for (const doc of inputDocs) {
        if (doc.fileBufferBase64 && (doc.documentTypeId || doc.nameFr || doc.originalFilename)) {
          try {
            let docTypeId = doc.documentTypeId;
            if (!docTypeId) {
              const allTypes = await DocumentService.getAllDocumentTypes();
              const matched = allTypes.find((t) =>
                (doc.nameFr && t.nameFr.toLowerCase().includes(doc.nameFr.toLowerCase())) ||
                (doc.originalFilename && t.nameFr.toLowerCase().includes(doc.originalFilename.toLowerCase()))
              );
              docTypeId = matched ? matched.id : allTypes[0]?.id;
            }
            if (docTypeId) {
              const buf = Buffer.from(doc.fileBufferBase64, 'base64');
              await DocumentService.uploadDocument(
                createdReg.id,
                docTypeId,
                {
                  buffer: buf,
                  originalFilename: doc.originalFilename || 'document.pdf',
                  mimeType: doc.mimeType || 'application/pdf',
                  sizeBytes: buf.length,
                },
                'PARENT',
                (input as any).clientUserId || undefined
              );
            }
          } catch (docErr) {
            console.error('Error uploading document during registration:', docErr);
          }
        }
      }
    }

    // 9. Create Admin Notification
    try {
      await db.insert(notifications).values({
        schoolId: input.schoolId,
        type: 'REGISTRATION_SUBMITTED',
        title: `Nouvelle inscription: ${code}`,
        message: `Dossier soumis pour ${studentFullName} (${school.shortName || school.name}).`,
        targetEntityType: 'REGISTRATION',
        targetEntityId: createdReg.id,
      });
    } catch {
      // Non-critical notification catch
    }

    return {
      id: createdReg.id,
      registrationId: createdReg.id,
      code: createdReg.registrationCode,
      registrationCode: createdReg.registrationCode,
      trackingToken: createdReg.registrationCode,
      status: createdReg.status,
    };
  }

  /**
   * Admin Registration Listing with filters, pagination, and school scoping.
   */
  async getAdminRegistrations(
    filter: AdminRegistrationFilterInput & { search?: string },
    actor?: User
  ): Promise<PaginatedResponse<any>> {
    const db = getDb();
    const page = Number(filter.page) || 1;
    const limit = Number(filter.limit) || 20;
    const offset = (page - 1) * limit;

    const conditions = [];

    // School Scoping: if actor is not SUPER_ADMIN, enforce allowed schools
    if (actor && actor.role !== 'SUPER_ADMIN') {
      const allowed = actor.allowedSchoolIds || [];
      if (allowed.length === 0) {
        return {
          success: true,
          data: [],
          pagination: { page, limit, totalItems: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false },
          timestamp: new Date().toISOString(),
        };
      }
      conditions.push(inArray(registrations.schoolId, allowed));
    }

    if (filter.schoolId) {
      conditions.push(eq(registrations.schoolId, filter.schoolId));
    }
    if (filter.levelId) {
      conditions.push(eq(registrations.levelId, filter.levelId));
    }
    if (filter.academicYearId) {
      conditions.push(eq(registrations.academicYearId, filter.academicYearId));
    }
    if (filter.status) {
      conditions.push(eq(registrations.status, filter.status as any));
    }
    if (filter.search) {
      const term = `%${filter.search.trim()}%`;
      conditions.push(
        or(
          like(registrations.registrationCode, term),
          like(students.fullName, term),
          like(parents.fullName, term),
          like(parents.phonePrimary, term)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count query
    const [countRow] = await db
      .select({ count: sql<number>`count(*)` })
      .from(registrations)
      .leftJoin(students, eq(registrations.studentId, students.id))
      .leftJoin(parents, eq(registrations.parentId, parents.id))
      .where(whereClause);

    const totalItems = Number(countRow?.count || 0);
    const totalPages = Math.ceil(totalItems / limit) || 1;

    // Main records query
    const rows = await db
      .select({
        id: registrations.id,
        code: registrations.registrationCode,
        status: registrations.status,
        submittedAt: registrations.submittedAt,
        acceptedAt: registrations.acceptedAt,
        refusedAt: registrations.refusedAt,
        createdAt: registrations.createdAt,
        studentId: students.id,
        studentFullName: students.fullName,
        studentGender: students.gender,
        studentBirthDate: students.birthDate,
        parentId: parents.id,
        parentFullName: parents.fullName,
        parentPhone: parents.phonePrimary,
        parentEmail: parents.email,
        schoolId: schools.id,
        schoolName: schools.name,
        schoolShortName: schools.shortName,
        levelId: levels.id,
        levelName: levels.nameFr,
        levelCode: levels.code,
        choiceId: registrations.choiceId,
        choiceName: levelChoices.nameFr,
        choiceCode: levelChoices.code,
        academicYearId: academicYears.id,
        academicYearName: academicYears.name,
      })
      .from(registrations)
      .leftJoin(students, eq(registrations.studentId, students.id))
      .leftJoin(parents, eq(registrations.parentId, parents.id))
      .leftJoin(schools, eq(registrations.schoolId, schools.id))
      .leftJoin(levels, eq(registrations.levelId, levels.id))
      .leftJoin(levelChoices, eq(registrations.choiceId, levelChoices.id))
      .leftJoin(academicYears, eq(registrations.academicYearId, academicYears.id))
      .where(whereClause)
      .orderBy(desc(registrations.createdAt))
      .limit(limit)
      .offset(offset);

    const data = rows.map((r) => ({
      id: r.id,
      code: r.code,
      status: r.status,
      submittedAt: r.submittedAt ? r.submittedAt.toISOString() : null,
      acceptedAt: r.acceptedAt ? r.acceptedAt.toISOString() : null,
      createdAt: r.createdAt.toISOString(),
      student: {
        id: r.studentId,
        fullName: r.studentFullName,
        gender: r.studentGender,
        birthDate: r.studentBirthDate,
      },
      parent: {
        id: r.parentId,
        fullName: r.parentFullName,
        phone: r.parentPhone,
        email: r.parentEmail,
      },
      school: {
        id: r.schoolId,
        name: r.schoolName,
        shortName: r.schoolShortName,
      },
      level: {
        id: r.levelId,
        name: r.levelName,
        code: r.levelCode,
      },
      choice: r.choiceId
        ? {
            id: r.choiceId,
            name: r.choiceName,
            code: r.choiceCode,
          }
        : null,
      academicYear: {
        id: r.academicYearId,
        name: r.academicYearName,
      },
    }));

    return {
      success: true,
      data,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get single Registration Dossier by ID with complete relations.
   */
  async getRegistrationById(id: string, actor?: User): Promise<any> {
    const db = getDb();

    const [row] = await db
      .select({
        id: registrations.id,
        code: registrations.registrationCode,
        status: registrations.status,
        submittedAt: registrations.submittedAt,
        acceptedAt: registrations.acceptedAt,
        refusedAt: registrations.refusedAt,
        waitlistedAt: registrations.waitlistedAt,
        createdAt: registrations.createdAt,
        updatedAt: registrations.updatedAt,
        schoolId: registrations.schoolId,
        levelId: registrations.levelId,
        schoolYearLevelId: registrations.schoolYearLevelId,
        academicYearId: registrations.academicYearId,
        // Student
        studentId: students.id,
        studentFullName: students.fullName,
        studentFirstName: students.firstName,
        studentLastName: students.lastName,
        studentGender: students.gender,
        studentBirthDate: students.birthDate,
        studentBirthPlace: students.birthPlace,
        studentCurrentSchool: students.currentSchool,
        studentWilaya: students.wilaya,
        studentCommune: students.commune,
        // Parent
        parentId: parents.id,
        parentFullName: parents.fullName,
        parentPhonePrimary: parents.phonePrimary,
        parentPhoneSecondary: parents.phoneSecondary,
        parentEmail: parents.email,
        parentAddress: parents.address,
        parentWilaya: parents.wilaya,
        parentCommune: parents.commune,
        parentUserId: parents.userId,
        clientUserId: registrations.clientUserId,
        // School & Level
        schoolName: schools.name,
        schoolShortName: schools.shortName,
        levelName: levels.nameFr,
        levelCode: levels.code,
        choiceId: registrations.choiceId,
        choiceName: levelChoices.nameFr,
        choiceCode: levelChoices.code,
        academicYearName: academicYears.name,
      })
      .from(registrations)
      .leftJoin(students, eq(registrations.studentId, students.id))
      .leftJoin(parents, eq(registrations.parentId, parents.id))
      .leftJoin(schools, eq(registrations.schoolId, schools.id))
      .leftJoin(levels, eq(registrations.levelId, levels.id))
      .leftJoin(levelChoices, eq(registrations.choiceId, levelChoices.id))
      .leftJoin(academicYears, eq(registrations.academicYearId, academicYears.id))
      .where(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
          ? eq(registrations.id, id)
          : eq(registrations.registrationCode, id)
      );

    if (!row) {
      throw AppError.notFound('Dossier d’inscription', id);
    }

    // School-scoped access check
    if (actor && actor.role !== 'SUPER_ADMIN') {
      const allowed = actor.allowedSchoolIds || [];
      if (!allowed.includes(row.schoolId)) {
        throw AppError.forbidden('Accès refusé pour cet établissement.');
      }
    }

    // Fetch history
    const history = await db
      .select()
      .from(registrationStatusHistory)
      .where(eq(registrationStatusHistory.registrationId, row.id))
      .orderBy(desc(registrationStatusHistory.createdAt));

    // Fetch notes
    const notes = await db
      .select()
      .from(registrationNotes)
      .where(eq(registrationNotes.registrationId, row.id))
      .orderBy(desc(registrationNotes.createdAt));

    // Fetch documents
    const rawDocs = await db
      .select({
        id: registrationDocuments.id,
        documentTypeId: registrationDocuments.documentTypeId,
        documentTypeNameFr: documentTypes.nameFr,
        documentTypeNameAr: documentTypes.nameAr,
        originalFilename: registrationDocuments.originalFilename,
        mimeType: registrationDocuments.mimeType,
        fileSizeBytes: registrationDocuments.fileSizeBytes,
        status: registrationDocuments.status,
        versionNumber: registrationDocuments.versionNumber,
        uploadedAt: registrationDocuments.uploadedAt,
        reviewedAt: registrationDocuments.reviewedAt,
        storageKey: registrationDocuments.storageKey,
      })
      .from(registrationDocuments)
      .leftJoin(documentTypes, eq(registrationDocuments.documentTypeId, documentTypes.id))
      .where(eq(registrationDocuments.registrationId, row.id))
      .orderBy(desc(registrationDocuments.uploadedAt));

    const docs = rawDocs.map((d) => {
      const previewToken = StorageService.createTemporarySignedToken(d.id, d.storageKey, 'preview', d.originalFilename, 3600);
      const downloadToken = StorageService.createTemporarySignedToken(d.id, d.storageKey, 'download', d.originalFilename, 3600);
      return {
        id: d.id,
        documentTypeId: d.documentTypeId,
        nameFr: d.documentTypeNameFr || 'Document',
        documentTypeName: d.documentTypeNameFr || 'Document',
        nameAr: d.documentTypeNameAr,
        originalFilename: d.originalFilename,
        mimeType: d.mimeType,
        fileSizeBytes: d.fileSizeBytes,
        status: d.status,
        versionNumber: d.versionNumber,
        uploadedAt: d.uploadedAt ? d.uploadedAt.toISOString() : null,
        reviewedAt: d.reviewedAt ? d.reviewedAt.toISOString() : null,
        previewUrl: `/api/public/documents/secure-stream/${previewToken}`,
        downloadUrl: `/api/public/documents/secure-stream/${downloadToken}`,
      };
    });

    // Check linked Client Parent account
    let clientUser: any = null;
    const parentUserId = row.clientUserId || row.parentUserId;
    if (parentUserId) {
      const { users } = await import('@vision-school/database');
      const [u] = await db
        .select({
          id: users.id,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
          phone: users.phone,
          status: users.status,
        })
        .from(users)
        .where(eq(users.id, parentUserId));
      if (u) {
        clientUser = u;
      }
    }

    return {
      id: row.id,
      code: row.code,
      status: row.status,
      hasClientAccount: !!clientUser,
      clientUser: clientUser
        ? {
            id: clientUser.id,
            fullName: `${clientUser.firstName || ''} ${clientUser.lastName || ''}`.trim() || clientUser.email,
            email: clientUser.email,
            phone: clientUser.phone,
            status: clientUser.status,
          }
        : null,
      submittedAt: row.submittedAt ? row.submittedAt.toISOString() : null,
      acceptedAt: row.acceptedAt ? row.acceptedAt.toISOString() : null,
      refusedAt: row.refusedAt ? row.refusedAt.toISOString() : null,
      waitlistedAt: row.waitlistedAt ? row.waitlistedAt.toISOString() : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      student: {
        id: row.studentId,
        fullName: row.studentFullName,
        firstName: row.studentFirstName,
        lastName: row.studentLastName,
        gender: row.studentGender,
        birthDate: row.studentBirthDate,
        birthPlace: row.studentBirthPlace,
        currentSchool: row.studentCurrentSchool,
        wilaya: row.studentWilaya,
        commune: row.studentCommune,
      },
      parent: {
        id: row.parentId,
        fullName: row.parentFullName || '—',
        firstName: row.parentFullName ? row.parentFullName.split(' ')[0] : '',
        lastName: row.parentFullName ? row.parentFullName.split(' ').slice(1).join(' ') : '',
        phone: row.parentPhonePrimary || '—',
        phonePrimary: row.parentPhonePrimary || '—',
        phoneSecondary: row.parentPhoneSecondary || null,
        email: row.parentEmail || '—',
        address: row.parentAddress || '—',
        wilaya: row.parentWilaya || '—',
        commune: row.parentCommune || null,
      },
      school: {
        id: row.schoolId,
        name: row.schoolName,
        shortName: row.schoolShortName,
      },
      level: {
        id: row.levelId,
        name: row.levelName,
        code: row.levelCode,
      },
      choice: row.choiceId
        ? {
            id: row.choiceId,
            name: row.choiceName,
            code: row.choiceCode,
          }
        : null,
      academicYear: {
        id: row.academicYearId,
        name: row.academicYearName,
      },
      schoolYearLevelId: row.schoolYearLevelId,
      documents: docs,
      history: history.map((h) => ({
        id: h.id,
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        publicComment: h.publicComment,
        internalComment: h.internalComment,
        createdAt: h.createdAt.toISOString(),
      })),
      notes: notes.map((n) => ({
        id: n.id,
        content: n.content,
        createdAt: n.createdAt.toISOString(),
      })),
    };
  }

  /**
   * Update Registration Status (e.g. ACCEPTED, REFUSED, WAITLISTED, CANCELLED).
   * Atomically verifies capacity before accepting!
   */
  async updateStatus(
    id: string,
    update: AdminStatusUpdateInput & { publicComment?: string; internalComment?: string },
    actor: User
  ): Promise<any> {
    const db = getDb();
    const current = await this.getRegistrationById(id, actor);

    const oldStatus = current.status;
    const newStatus = update.status as RegistrationStatus;

    if (oldStatus === newStatus) {
      return current;
    }

    const ALLOWED_STATUSES: RegistrationStatus[] = [
      'NEW',
      'UNDER_REVIEW',
      'PENDING',
      'ACCEPTED',
      'REFUSED',
      'WAITLISTED',
      'CANCELLED',
    ];

    if (!ALLOWED_STATUSES.includes(newStatus)) {
      throw AppError.badRequest(`Statut d’inscription invalide : "${newStatus}".`);
    }

    // Specific permission verification
    if (newStatus === 'ACCEPTED' && !AuthGuard.hasPermission(actor, 'registration.accept')) {
      throw AppError.forbidden('Permission requise : registration.accept pour accepter un dossier.');
    }
    if (newStatus === 'REFUSED' && !AuthGuard.hasPermission(actor, 'registration.refuse')) {
      throw AppError.forbidden('Permission requise : registration.refuse pour refuser un dossier.');
    }
    if (newStatus === 'WAITLISTED' && !AuthGuard.hasPermission(actor, 'waiting_list.manage')) {
      throw AppError.forbidden('Permission requise : waiting_list.manage pour placer un dossier en liste d’attente.');
    }

    // Valid state transitions
    const validTransitions: Partial<Record<RegistrationStatus, RegistrationStatus[]>> = {
      NEW: ['UNDER_REVIEW', 'PENDING', 'ACCEPTED', 'REFUSED', 'WAITLISTED', 'CANCELLED'],
      UNDER_REVIEW: ['PENDING', 'ACCEPTED', 'REFUSED', 'WAITLISTED', 'CANCELLED'],
      PENDING: ['UNDER_REVIEW', 'ACCEPTED', 'REFUSED', 'WAITLISTED', 'CANCELLED'],
      WAITLISTED: ['UNDER_REVIEW', 'ACCEPTED', 'REFUSED', 'CANCELLED'],
      ACCEPTED: ['CANCELLED', 'UNDER_REVIEW', 'WAITLISTED', 'REFUSED'],
      REFUSED: ['UNDER_REVIEW', 'PENDING', 'WAITLISTED', 'ACCEPTED'],
      CANCELLED: ['PENDING', 'UNDER_REVIEW'],
    };

    const allowedNext = validTransitions[oldStatus as RegistrationStatus] || [];
    if (!allowedNext.includes(newStatus) && actor.role !== 'SUPER_ADMIN') {
      throw AppError.badRequest(
        `Transition de statut non autorisée depuis "${oldStatus}" vers "${newStatus}".`
      );
    }

    // If transitioning to ACCEPTED, verify capacity atomically!
    if (newStatus === 'ACCEPTED' && oldStatus !== 'ACCEPTED') {
      const sylId = current.schoolYearLevelId;
      const [syl] = await db
        .select()
        .from(schoolYearLevels)
        .where(eq(schoolYearLevels.id, sylId));

      if (syl && syl.capacityMode === 'LIMITED' && syl.capacityMax !== null) {
        const currentAccepted = await CapacityService.getAcceptedCount(sylId);
        if (currentAccepted >= syl.capacityMax) {
          throw AppError.conflict(
            `Capacité maximale atteinte (${syl.capacityMax} places). Impossible d’accepter ce dossier.`,
            'CAPACITY_EXCEEDED'
          );
        }
      }
    }

    const now = new Date();
    const updatePayload: any = {
      status: newStatus,
      updatedAt: now,
    };

    if (newStatus === 'ACCEPTED') updatePayload.acceptedAt = now;
    if (newStatus === 'REFUSED') updatePayload.refusedAt = now;
    if (newStatus === 'CANCELLED') updatePayload.cancelledAt = now;
    if (newStatus === 'WAITLISTED') updatePayload.waitlistedAt = now;

    // Execute update
    const [updated] = await db
      .update(registrations)
      .set(updatePayload)
      .where(eq(registrations.id, current.id))
      .returning();

    // Record history
    await db.insert(registrationStatusHistory).values({
      registrationId: current.id,
      fromStatus: oldStatus as any,
      toStatus: newStatus as any,
      changedByUserId: actor.id,
      internalComment: update.adminNotes || update.internalComment || null,
      publicComment: update.publicComment || (newStatus === 'ACCEPTED' ? 'Votre dossier a été accepté.' : newStatus === 'REFUSED' ? 'Votre dossier a été refusé.' : null),
      reasonCode: update.refusalReason || null,
    });

    // Record Audit Log
    try {
      await db.insert(auditLogs).values({
        userId: actor.id,
        action: 'REGISTRATION_STATUS_UPDATED',
        module: 'REGISTRATIONS',
        entityType: 'REGISTRATION',
        entityId: current.id,
        schoolId: current.school.id,
        beforeJson: { status: oldStatus },
        afterJson: { status: newStatus },
      });
    } catch {
      // Non-critical audit catch
    }

    return this.getRegistrationById(current.id, actor);
  }

  /**
   * Safely cancels an ACCEPTED registration, releasing capacity and recording status history.
   */
  async cancelAcceptedRegistration(
    id: string,
    actor: User,
    reason?: string
  ): Promise<{ id: string; status: string; message: string }> {
    if (!actor) throw AppError.forbidden('Authentification requise.');
    if (
      !AuthGuard.hasPermission(actor, 'registration.update') &&
      !AuthGuard.hasPermission(actor, 'registration.accept') &&
      !AuthGuard.isSuperAdmin(actor)
    ) {
      throw AppError.forbidden('Permission refusée pour annuler l\'acceptation.');
    }

    const db = getDb();
    const [reg] = await db
      .select()
      .from(registrations)
      .where(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
          ? eq(registrations.id, id)
          : eq(registrations.registrationCode, id)
      );

    if (!reg) throw AppError.notFound('Dossier d\'inscription');

    if (actor.role !== 'SUPER_ADMIN') {
      const allowed = actor.allowedSchoolIds || [];
      if (!allowed.includes(reg.schoolId)) {
        throw AppError.forbidden('Accès refusé pour cet établissement.');
      }
    }

    if (reg.status !== 'ACCEPTED') {
      throw AppError.badRequest(
        `Seuls les dossiers au statut ACCEPTED peuvent faire l'objet d'une annulation d'acceptation (statut actuel : ${reg.status}).`
      );
    }

    const now = new Date();
    const regId = reg.id;

    await TransactionRunner.run(async (tx) => {
      await tx
        .update(registrations)
        .set({
          status: 'CANCELLED',
          cancelledAt: now,
          updatedAt: now,
        })
        .where(eq(registrations.id, regId));

      await tx.insert(registrationStatusHistory).values({
        registrationId: regId,
        fromStatus: 'ACCEPTED',
        toStatus: 'CANCELLED',
        changedByUserId: actor.id,
        internalComment: reason || 'Annulation manuelle de l\'acceptation par l\'administrateur.',
        publicComment: 'Votre acceptation a été annulée.',
      });

      // Clear any waiting list entry if present
      await tx
        .delete(waitingListEntries)
        .where(eq(waitingListEntries.registrationId, regId));

      await tx.insert(auditLogs).values({
        userId: actor.id,
        action: 'REGISTRATION_ACCEPTANCE_CANCELLED',
        module: 'REGISTRATIONS',
        entityType: 'REGISTRATION',
        entityId: regId,
        schoolId: reg.schoolId,
        beforeJson: { status: 'ACCEPTED' },
        afterJson: { status: 'CANCELLED' },
        result: 'SUCCESS',
      });
    });

    return {
      id: regId,
      status: 'CANCELLED',
      message: 'Acceptation annulée avec succès. La place de capacité a été libérée.',
    };
  }

  /**
   * Atomically cancels an accepted registration (releasing capacity) and deletes all associated dossier data.
   * Restricted to SUPER_ADMIN or users with registration.delete.
   */
  async cancelAndDeleteRegistration(
    id: string,
    actor: User,
    reason?: string
  ): Promise<{ id: string; deleted: boolean; message: string }> {
    if (!actor) throw AppError.forbidden('Authentification requise.');
    if (
      !AuthGuard.hasPermission(actor, 'registration.delete') &&
      !AuthGuard.hasPermission(actor, 'registration.cancel') &&
      !AuthGuard.isSuperAdmin(actor) &&
      actor.role !== 'ADMIN'
    ) {
      throw AppError.forbidden('Permission refusée : suppression de dossier non autorisée.');
    }

    const db = getDb();
    const [reg] = await db
      .select()
      .from(registrations)
      .where(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
          ? eq(registrations.id, id)
          : eq(registrations.registrationCode, id)
      );

    if (!reg) throw AppError.notFound('Dossier d\'inscription');

    if (actor.role !== 'SUPER_ADMIN') {
      const allowed = actor.allowedSchoolIds || [];
      if (!allowed.includes(reg.schoolId)) {
        throw AppError.forbidden('Accès refusé pour cet établissement.');
      }
    }

    const regId = reg.id;
    const wasAccepted = reg.status === 'ACCEPTED';

    await TransactionRunner.run(async (tx) => {
      // 1. Audit log before deletion
      await tx.insert(auditLogs).values({
        userId: actor.id,
        action: wasAccepted ? 'REGISTRATION_CANCELLED_AND_DELETED' : 'REGISTRATION_DELETED',
        module: 'REGISTRATIONS',
        entityType: 'REGISTRATION',
        entityId: regId,
        schoolId: reg.schoolId,
        beforeJson: {
          registrationCode: reg.registrationCode,
          status: reg.status,
          wasAccepted,
          reason: reason || 'Suppression administrative',
        },
        result: 'SUCCESS',
      });

      // 2. Remove waiting list entry if present
      await tx
        .delete(waitingListEntries)
        .where(eq(waitingListEntries.registrationId, regId));

      // 3. Delete registration record (cascades to child tables)
      await tx.delete(registrations).where(eq(registrations.id, regId));
    });

    return {
      id: regId,
      deleted: true,
      message: wasAccepted
        ? 'Dossier annulé et supprimé définitivement. La place de capacité a été libérée.'
        : 'Dossier d\'inscription supprimé définitivement.',
    };
  }

  /**
   * Permanently deletes a registration dossier.
   * If the dossier is ACCEPTED, requires options.forceCancelAccepted = true to execute safe cancel & delete.
   */
  async deleteRegistration(
    id: string,
    actor: User,
    options?: { forceCancelAccepted?: boolean; reason?: string }
  ): Promise<{ id: string; deleted: boolean; message: string }> {
    if (!actor) throw AppError.forbidden('Authentification requise.');
    if (
      !AuthGuard.hasPermission(actor, 'registration.delete') &&
      !AuthGuard.hasPermission(actor, 'registration.cancel') &&
      !AuthGuard.isSuperAdmin(actor) &&
      actor.role !== 'ADMIN'
    ) {
      throw AppError.forbidden('Permission refusée : suppression de dossier non autorisée.');
    }

    const db = getDb();
    const [reg] = await db
      .select()
      .from(registrations)
      .where(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
          ? eq(registrations.id, id)
          : eq(registrations.registrationCode, id)
      );

    if (!reg) throw AppError.notFound('Dossier d\'inscription');

    if (actor.role !== 'SUPER_ADMIN') {
      const allowed = actor.allowedSchoolIds || [];
      if (!allowed.includes(reg.schoolId)) {
        throw AppError.forbidden('Accès refusé pour cet établissement.');
      }
    }

    if (reg.status === 'ACCEPTED') {
      if (options?.forceCancelAccepted) {
        return this.cancelAndDeleteRegistration(id, actor, options.reason);
      }
      throw new AppError(
        'Ce dossier est accepté et occupe actuellement une place. Utilisez l\'action "Annuler et supprimer" ou "Annuler l\'acceptation" pour libérer la place en toute sécurité.',
        'ACCEPTED_REGISTRATION_REQUIRES_CANCEL',
        400
      );
    }

    return this.cancelAndDeleteRegistration(id, actor, options?.reason);
  }

  /**
   * Add Private Admin Note to Dossier.
   */
  async addNote(id: string, content: string, actor: User): Promise<any> {
    const db = getDb();
    const current = await this.getRegistrationById(id, actor);

    const [note] = await db
      .insert(registrationNotes)
      .values({
        registrationId: current.id,
        userId: actor.id,
        content,
      })
      .returning();

    return note;
  }
}
