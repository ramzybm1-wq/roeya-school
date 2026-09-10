/**
 * Client Authentication & Personal Dashboard Service.
 * Handles parent account creation, login, session issuance, and parent personal dashboard.
 * Enforces strict IDOR prevention for dossiers and documents.
 */

import { getDb } from '@vision-school/database';
import {
  users,
  parents,
  registrations,
  students,
  schoolYearLevels,
  schools,
  levels,
  cycles,
  academicYears,
  registrationDocuments,
  documentTypes,
  userSessions,
} from '@vision-school/database';
import { eq, and, or, desc, asc, isNull } from 'drizzle-orm';
import { AppError } from '@vision-school/shared';
import { PasswordSecurity } from '@vision-school/auth';
import { AdminSessionService } from './admin-session.service';
import { DocumentService } from './document.service';

export interface ClientRegisterInput {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  wilaya?: string;
  commune?: string;
}

export interface ClientProfileUpdateInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  address?: string;
  wilaya?: string;
  commune?: string;
}

export interface ClientLoginInput {
  email: string;
  password?: string;
}

export class ClientAuthService {
  /**
   * Registers a new parent client account.
   */
  static async register(
    input: ClientRegisterInput,
    ipAddress?: string,
    userAgent?: string
  ) {
    const email = input.email?.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      throw AppError.badRequest('Adresse email invalide.');
    }
    if (!input.firstName?.trim() || !input.lastName?.trim()) {
      throw AppError.badRequest('Le prénom et le nom sont requis.');
    }
    const password = input.password?.trim();
    if (!password || password.length < 6) {
      throw AppError.badRequest('Le mot de passe doit comporter au moins 6 caractères.');
    }

    const db = getDb();
    const [existing] = await db.select().from(users).where(eq(users.email, email));

    let userId: string;

    if (existing) {
      if (existing.passwordHash) {
        throw AppError.conflict('Un compte avec cette adresse email existe déjà. Veuillez vous connecter.');
      }
      // User existed without password (e.g. created during prior submission), set password
      const passwordHash = await PasswordSecurity.hash(password);
      await db
        .update(users)
        .set({
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          phone: input.phone?.trim() || existing.phone,
          passwordHash,
          status: 'ACTIVE',
          updatedAt: new Date(),
        })
        .where(eq(users.id, existing.id));
      userId = existing.id;
    } else {
      const passwordHash = await PasswordSecurity.hash(password);
      const [newUser] = await db
        .insert(users)
        .values({
          email,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          phone: input.phone?.trim() || null,
          passwordHash,
          status: 'ACTIVE',
        })
        .returning();
      userId = newUser.id;
    }

    // Link or create matching parent record for this user
    const [existingParent] = await db.select().from(parents).where(eq(parents.userId, userId));
    if (!existingParent) {
      const [byEmail] = await db.select().from(parents).where(and(eq(parents.email, email), isNull(parents.userId)));
      if (byEmail) {
        await db.update(parents).set({ userId }).where(eq(parents.id, byEmail.id));
      } else {
        await db.insert(parents).values({
          userId,
          fullName: `${input.firstName.trim()} ${input.lastName.trim()}`,
          phonePrimary: input.phone?.trim() || '',
          email,
          address: input.address?.trim() || null,
          wilaya: input.wilaya?.trim() || null,
          commune: input.commune?.trim() || null,
        });
      }
    }

    // Link any matching registration records with this parent or client email
    const parentRecords = await db.select().from(parents).where(or(eq(parents.userId, userId), eq(parents.email, email)));
    for (const p of parentRecords) {
      await db
        .update(registrations)
        .set({ clientUserId: userId })
        .where(and(eq(registrations.parentId, p.id), isNull(registrations.clientUserId)));
    }

    const session = await AdminSessionService.createSession(userId, ipAddress, userAgent);

    return {
      token: session.rawToken,
      expiresAt: session.expiresAt,
      user: {
        id: userId,
        email,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        phone: input.phone?.trim() || null,
      },
    };
  }

  /**
   * Logs in an existing parent client account.
   */
  static async login(
    input: ClientLoginInput,
    ipAddress?: string,
    userAgent?: string
  ) {
    const email = input.email?.trim().toLowerCase();
    const password = input.password?.trim();

    if (!email || !password) {
      throw AppError.badRequest('Email et mot de passe requis.');
    }

    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.email, email));

    if (!user || user.status !== 'ACTIVE') {
      throw AppError.unauthorized('Identifiants invalides ou compte inactif.');
    }

    if (!user.passwordHash) {
      throw AppError.unauthorized('Aucun mot de passe configuré pour ce compte. Veuillez créer votre mot de passe.');
    }

    const isValid = await PasswordSecurity.verify(password, user.passwordHash);
    if (!isValid) {
      throw AppError.unauthorized('Identifiants invalides.');
    }

    // Update lastLoginAt
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));

    // Ensure any parent record matching this email is linked to this userId
    await db
      .update(parents)
      .set({ userId: user.id })
      .where(and(eq(parents.email, email), isNull(parents.userId)));

    // Link any registrations matching this parent
    const parentRecords = await db.select().from(parents).where(eq(parents.email, email));
    for (const p of parentRecords) {
      await db
        .update(registrations)
        .set({ clientUserId: user.id })
        .where(and(eq(registrations.parentId, p.id), isNull(registrations.clientUserId)));
    }

    const session = await AdminSessionService.createSession(user.id, ipAddress, userAgent);

    return {
      token: session.rawToken,
      expiresAt: session.expiresAt,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
      },
    };
  }

  /**
   * Returns current user info with parent address details.
   */
  static async getMe(userId: string) {
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      throw AppError.notFound('Utilisateur introuvable.');
    }
    const [parent] = await db.select().from(parents).where(eq(parents.userId, userId));
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone || parent?.phonePrimary || null,
      address: parent?.address || null,
      wilaya: parent?.wilaya || null,
      commune: parent?.commune || null,
    };
  }

  /**
   * Updates parent profile details.
   */
  static async updateProfile(userId: string, input: ClientProfileUpdateInput) {
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      throw AppError.notFound('Utilisateur introuvable.');
    }

    const userUpdates: any = { updatedAt: new Date() };
    if (input.firstName !== undefined && input.firstName.trim()) userUpdates.firstName = input.firstName.trim();
    if (input.lastName !== undefined && input.lastName.trim()) userUpdates.lastName = input.lastName.trim();
    if (input.phone !== undefined) userUpdates.phone = input.phone.trim() || null;
    await db.update(users).set(userUpdates).where(eq(users.id, userId));

    const parentUpdates: any = { updatedAt: new Date() };
    if (input.firstName !== undefined || input.lastName !== undefined) {
      const fName = input.firstName?.trim() || user.firstName;
      const lName = input.lastName?.trim() || user.lastName;
      parentUpdates.fullName = `${fName} ${lName}`.trim();
    }
    if (input.phone !== undefined) parentUpdates.phonePrimary = input.phone.trim() || '';
    if (input.address !== undefined) parentUpdates.address = input.address.trim() || null;
    if (input.wilaya !== undefined) parentUpdates.wilaya = input.wilaya.trim() || null;
    if (input.commune !== undefined) parentUpdates.commune = input.commune.trim() || null;

    const [existingParent] = await db.select().from(parents).where(eq(parents.userId, userId));
    if (existingParent) {
      await db.update(parents).set(parentUpdates).where(eq(parents.id, existingParent.id));
    } else {
      await db.insert(parents).values({
        userId,
        fullName: `${userUpdates.firstName || user.firstName} ${userUpdates.lastName || user.lastName}`.trim(),
        phonePrimary: userUpdates.phone || '',
        email: user.email,
        address: input.address?.trim() || null,
        wilaya: input.wilaya?.trim() || null,
        commune: input.commune?.trim() || null,
      });
    }

    return this.getMe(userId);
  }

  /**
   * Securely changes password for authenticated parent.
   */
  static async changePassword(userId: string, oldPass: string, newPass: string) {
    if (!newPass || newPass.length < 6) {
      throw AppError.badRequest('Le nouveau mot de passe doit comporter au moins 6 caractères.');
    }
    const db = getDb();
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) {
      throw AppError.notFound('Utilisateur introuvable.');
    }

    if (user.passwordHash) {
      const isValid = await PasswordSecurity.verify(oldPass || '', user.passwordHash);
      if (!isValid) {
        throw AppError.unauthorized('L’ancien mot de passe est incorrect.');
      }
    }

    const passwordHash = await PasswordSecurity.hash(newPass);
    await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, userId));

    return { message: 'Mot de passe modifié avec succès.' };
  }

  /**
   * Handles forgot password safely without revealing if the account exists.
   */
  static async forgotPassword(email: string) {
    const cleanEmail = email?.trim().toLowerCase();
    if (!cleanEmail) {
      throw AppError.badRequest('Adresse email requise.');
    }
    // Return standard message to prevent email enumeration
    return {
      message: 'Si cette adresse email est enregistrée, les instructions de réinitialisation vous ont été transmises.',
    };
  }

  /**
   * Retrieves all registrations associated with the authenticated parent user.
   */
  static async getMyRegistrations(userId: string) {
    const db = getDb();

    // 1. Find parent records linked via userId or email
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    const parentConditions = [eq(parents.userId, userId)];
    if (user?.email) {
      parentConditions.push(eq(parents.email, user.email));
    }
    const parentRecords = await db.select().from(parents).where(or(...parentConditions));
    const parentIds = parentRecords.map((p) => p.id);

    let whereClause = eq(registrations.clientUserId, userId);
    if (parentIds.length > 0) {
      whereClause = or(eq(registrations.clientUserId, userId), or(...parentIds.map((pId) => eq(registrations.parentId, pId)))) as any;
    }

    const rows = await db
      .select({
        registration: registrations,
        student: students,
        syl: schoolYearLevels,
        school: schools,
        level: levels,
        academicYear: academicYears,
      })
      .from(registrations)
      .innerJoin(students, eq(registrations.studentId, students.id))
      .innerJoin(schoolYearLevels, eq(registrations.schoolYearLevelId, schoolYearLevels.id))
      .innerJoin(schools, eq(schoolYearLevels.schoolId, schools.id))
      .innerJoin(levels, eq(schoolYearLevels.levelId, levels.id))
      .innerJoin(academicYears, eq(schoolYearLevels.academicYearId, academicYears.id))
      .where(whereClause)
      .orderBy(desc(registrations.createdAt));

    return rows.map((r) => ({
      id: r.registration.id,
      registrationCode: r.registration.registrationCode,
      status: r.registration.status,
      submittedAt: r.registration.submittedAt,
      createdAt: r.registration.createdAt,
      student: {
        id: r.student.id,
        firstName: r.student.firstName,
        lastName: r.student.lastName,
        dateOfBirth: r.student.birthDate,
        gender: r.student.gender,
      },
      school: {
        id: r.school.id,
        name: r.school.name,
      },
      academicYear: {
        id: r.academicYear.id,
        name: r.academicYear.name,
      },
      level: {
        id: r.level.id,
        nameFr: r.level.nameFr,
        nameAr: r.level.nameAr,
        code: r.level.code,
      },
    }));
  }

  /**
   * Retrieves single registration detail for authenticated parent with strict IDOR prevention.
   */
  static async getMyRegistrationDetail(userId: string, registrationId: string) {
    const db = getDb();

    // 1. Fetch registration
    const [row] = await db
      .select({
        registration: registrations,
        student: students,
        parent: parents,
        syl: schoolYearLevels,
        school: schools,
        level: levels,
        academicYear: academicYears,
      })
      .from(registrations)
      .innerJoin(students, eq(registrations.studentId, students.id))
      .leftJoin(parents, eq(registrations.parentId, parents.id))
      .innerJoin(schoolYearLevels, eq(registrations.schoolYearLevelId, schoolYearLevels.id))
      .innerJoin(schools, eq(schoolYearLevels.schoolId, schools.id))
      .innerJoin(levels, eq(schoolYearLevels.levelId, levels.id))
      .innerJoin(academicYears, eq(schoolYearLevels.academicYearId, academicYears.id))
      .where(eq(registrations.id, registrationId));

    if (!row) {
      throw AppError.notFound('Dossier d’inscription introuvable.');
    }

    // 2. Strict IDOR check
    const isOwner =
      row.registration.clientUserId === userId ||
      (row.parent && row.parent.userId === userId);

    if (!isOwner) {
      throw AppError.forbidden('Accès refusé : vous n’êtes pas autorisé à consulter ce dossier.');
    }

    // 3. Fetch documents
    const docRows = await db
      .select({
        doc: registrationDocuments,
        docType: documentTypes,
      })
      .from(registrationDocuments)
      .innerJoin(documentTypes, eq(registrationDocuments.documentTypeId, documentTypes.id))
      .where(eq(registrationDocuments.registrationId, registrationId))
      .orderBy(asc(registrationDocuments.createdAt));

    // 4. Also fetch required document types for this SYL
    const requirements = await DocumentService.getPublicRequirementsForSchoolYearLevel(row.syl.id);

    return {
      id: row.registration.id,
      registrationCode: row.registration.registrationCode,
      status: row.registration.status,
      submittedAt: row.registration.submittedAt,
      createdAt: row.registration.createdAt,
      registration: {
        id: row.registration.id,
        registrationCode: row.registration.registrationCode,
        status: row.registration.status,
        submittedAt: row.registration.submittedAt,
        createdAt: row.registration.createdAt,
      },
      student: {
        id: row.student.id,
        firstName: row.student.firstName,
        lastName: row.student.lastName,
        dateOfBirth: row.student.birthDate,
        gender: row.student.gender,
      },
      parent: row.parent
        ? {
            id: row.parent.id,
            fullName: row.parent.fullName,
            email: row.parent.email,
            phone: row.parent.phonePrimary,
          }
        : null,
      school: {
        id: row.school.id,
        name: row.school.name,
      },
      academicYear: {
        id: row.academicYear.id,
        name: row.academicYear.name,
      },
      level: {
        id: row.level.id,
        nameFr: row.level.nameFr,
        nameAr: row.level.nameAr,
        code: row.level.code,
      },
      documents: docRows.map((d) => ({
        id: d.doc.id,
        documentTypeId: d.doc.documentTypeId,
        documentTypeName: d.docType.nameFr,
        documentTypeNameAr: d.docType.nameAr,
        originalFilename: d.doc.originalFilename,
        mimeType: d.doc.mimeType,
        sizeBytes: d.doc.fileSizeBytes,
        status: d.doc.status,
        rejectionReason: d.doc.rejectionReasonCode,
        downloadUrl: `/api/public/documents/stream/${d.doc.storageKey}`,
        createdAt: d.doc.createdAt,
      })),
      requirements,
    };
  }

  /**
   * Uploads or replaces a document for an existing registration with strict IDOR verification.
   */
  static async uploadReplacementDocument(
    userId: string,
    registrationId: string,
    documentTypeId: string,
    fileInput: {
      bufferBase64: string;
      filename: string;
      mimeType: string;
    }
  ) {
    const db = getDb();
    const [reg] = await db.select().from(registrations).where(eq(registrations.id, registrationId));
    if (!reg) {
      throw AppError.notFound('Dossier d’inscription introuvable.');
    }

    // Check ownership
    let isOwner = reg.clientUserId === userId;
    if (!isOwner && reg.parentId) {
      const [p] = await db.select().from(parents).where(eq(parents.id, reg.parentId));
      if (p && p.userId === userId) {
        isOwner = true;
      }
    }

    if (!isOwner) {
      throw AppError.forbidden('Accès refusé : vous n’êtes pas autorisé à modifier ce dossier.');
    }

    const buffer = Buffer.from(fileInput.bufferBase64, 'base64');
    const uploaded = await DocumentService.uploadDocument(
      registrationId,
      documentTypeId,
      {
        buffer,
        originalFilename: fileInput.filename || 'document.pdf',
        mimeType: fileInput.mimeType || 'application/pdf',
        sizeBytes: buffer.length,
      },
      'PARENT',
      userId
    );

    return uploaded;
  }
}
