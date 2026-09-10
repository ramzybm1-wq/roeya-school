/**
 * Client Registration Tracking Service for VISION SCHOOL.
 * - Handles secure dossier lookup (Registration Code + Parent Phone verification).
 * - Anti-enumeration protection (identical generic error on invalid code or phone mismatch).
 * - Issues short-lived, signed tracking session tokens (15-30 min validity).
 * - Maps internal statuses to client-safe public statuses and timelines.
 * - Enforces waiting-list position privacy.
 * - Authorizes safe document replacement uploads.
 * Private documents, admin user IDs, and internal notes are strictly excluded from responses.
 */

import { getDb } from '@vision-school/database';
import {
  registrations,
  parents,
  students,
  schools,
  levels,
  academicYears,
  schoolYearLevels,
  registrationStatusHistory,
  auditLogs,
} from '@vision-school/database';
import { eq, and, desc, asc } from 'drizzle-orm';
import { AppError, PublicDossierResponse, PublicTimelineEvent, PublicDocumentItem } from '@vision-school/shared';
import { DocumentService } from './document.service';
import { WaitingListService } from './waiting-list.service';
import crypto from 'crypto';

export interface TrackingSessionPayload {
  registrationId: string;
  registrationCode: string;
  expiresAt: number; // Unix timestamp in ms
}

export type { PublicDossierResponse, PublicTimelineEvent, PublicDocumentItem };

export class RegistrationTrackingService {
  private static readonly TRACKING_SECRET =
    process.env.TRACKING_SESSION_SECRET || 'vision_school_tracking_session_secret_2026';

  // Rate limiting map: key -> { attempts: number, resetAt: number }
  private static failedAttempts = new Map<string, { attempts: number; resetAt: number }>();

  /**
   * Normalizes Algerian phone number formats.
   */
  static normalizePhoneNumber(phone: string): string {
    let cleaned = phone.replace(/[\s\-\.\(\)\/]/g, '');
    if (cleaned.startsWith('+213')) {
      cleaned = '0' + cleaned.substring(4);
    } else if (cleaned.startsWith('00213')) {
      cleaned = '0' + cleaned.substring(5);
    } else if (cleaned.startsWith('213') && cleaned.length === 12) {
      cleaned = '0' + cleaned.substring(3);
    }
    return cleaned;
  }

  /**
   * Normalizes registration code format (e.g. "reg-2026-000125" -> "REG-2026-000125").
   */
  static normalizeRegistrationCode(code: string): string {
    return code.trim().toUpperCase();
  }

  /**
   * Enforces rate limiting on verification attempts.
   */
  private static checkRateLimit(key: string) {
    const now = Date.now();
    const entry = this.failedAttempts.get(key);

    if (entry && now < entry.resetAt) {
      if (entry.attempts >= 5) {
        throw new AppError(
          'FORBIDDEN',
          'Trop de tentatives infructueuses. Veuillez patienter 15 minutes avant de réessayer.'
        );
      }
    } else if (entry && now >= entry.resetAt) {
      this.failedAttempts.delete(key);
    }
  }

  private static recordFailedAttempt(key: string) {
    const now = Date.now();
    const entry = this.failedAttempts.get(key) || { attempts: 0, resetAt: now + 15 * 60 * 1000 };
    entry.attempts += 1;
    this.failedAttempts.set(key, entry);
  }

  /**
   * Verifies registration code + matching parent phone.
   * On invalid code OR phone mismatch: returns exact same generic error (Anti-Enumeration).
   */
  static async verifyTrackingAccess(
    registrationCode: string,
    parentPhone: string,
    clientIp = 'unknown_ip'
  ): Promise<{ trackingToken: string; expiresInSeconds: number }> {
    const normCode = this.normalizeRegistrationCode(registrationCode);
    const normPhone = this.normalizePhoneNumber(parentPhone);

    const rateLimitKey = `${clientIp}_${normCode}`;
    this.checkRateLimit(rateLimitKey);

    const genericErrorMsg = 'Les informations saisies ne permettent pas d’identifier une demande.';

    const db = getDb();
    const [reg] = await db
      .select({
        registration: registrations,
        parent: parents,
      })
      .from(registrations)
      .innerJoin(parents, eq(registrations.parentId, parents.id))
      .where(eq(registrations.registrationCode, normCode));

    if (!reg) {
      this.recordFailedAttempt(rateLimitKey);
      throw new AppError('VALIDATION_ERROR', genericErrorMsg);
    }

    const regParentPhoneNorm = this.normalizePhoneNumber(reg.parent.phonePrimary);
    if (regParentPhoneNorm !== normPhone) {
      this.recordFailedAttempt(rateLimitKey);
      throw new AppError('VALIDATION_ERROR', genericErrorMsg);
    }

    // Success -> clear rate limit entry for this key
    this.failedAttempts.delete(rateLimitKey);

    // Generate signed tracking session token (valid 20 minutes)
    const expiresInSeconds = 1200;
    const trackingToken = this.createTrackingSessionToken(reg.registration.id, normCode, expiresInSeconds);

    return {
      trackingToken,
      expiresInSeconds,
    };
  }

  /**
   * Generates HMAC-SHA256 signed tracking session token.
   */
  static createTrackingSessionToken(
    registrationId: string,
    registrationCode: string,
    expiresInSeconds = 1200
  ): string {
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    const payload: TrackingSessionPayload = {
      registrationId,
      registrationCode,
      expiresAt,
    };

    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.TRACKING_SECRET)
      .update(payloadBase64)
      .digest('base64url');

    return `${payloadBase64}.${signature}`;
  }

  /**
   * Verifies signed tracking session token.
   */
  static verifyTrackingSessionToken(token: string): {
    valid: boolean;
    payload?: TrackingSessionPayload;
    error?: string;
  } {
    try {
      const parts = token.split('.');
      if (parts.length !== 2) {
        return { valid: false, error: 'Format de session de suivi invalide.' };
      }

      const [payloadBase64, signature] = parts;
      const expectedSignature = crypto
        .createHmac('sha256', this.TRACKING_SECRET)
        .update(payloadBase64)
        .digest('base64url');

      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
        return { valid: false, error: 'Session de suivi invalide ou corrompue.' };
      }

      const jsonStr = Buffer.from(payloadBase64, 'base64url').toString('utf-8');
      const payload: TrackingSessionPayload = JSON.parse(jsonStr);

      if (Date.now() > payload.expiresAt) {
        return { valid: false, error: 'Votre session de consultation a expiré.' };
      }

      return { valid: true, payload };
    } catch {
      return { valid: false, error: 'Impossible de décoder la session de suivi.' };
    }
  }

  /**
   * Returns sanitized client-safe public dossier data.
   */
  static async getVerifiedDossier(trackingToken: string): Promise<PublicDossierResponse> {
    const verification = this.verifyTrackingSessionToken(trackingToken);
    if (!verification.valid || !verification.payload) {
      throw new AppError('FORBIDDEN', verification.error || 'Session de suivi expirée.');
    }

    const { registrationId } = verification.payload;
    const db = getDb();

    // 1. Fetch core entities
    const [row] = await db
      .select({
        reg: registrations,
        student: students,
        parent: parents,
        school: schools,
        level: levels,
        academicYear: academicYears,
        syl: schoolYearLevels,
      })
      .from(registrations)
      .innerJoin(students, eq(registrations.studentId, students.id))
      .innerJoin(parents, eq(registrations.parentId, parents.id))
      .innerJoin(schools, eq(registrations.schoolId, schools.id))
      .innerJoin(levels, eq(registrations.levelId, levels.id))
      .innerJoin(academicYears, eq(registrations.academicYearId, academicYears.id))
      .innerJoin(schoolYearLevels, eq(registrations.schoolYearLevelId, schoolYearLevels.id))
      .where(eq(registrations.id, registrationId));

    if (!row) {
      throw new AppError('NOT_FOUND', 'Dossier introuvable.');
    }

    // 2. Map Public Status & Status Messages
    const statusMapping = this.mapPublicStatus(row.reg.status);

    // 3. Document Summary
    const completeness = await DocumentService.getRegistrationDocumentCompleteness(registrationId);
    const documents: PublicDocumentItem[] = completeness.documents.map((doc) => {
      let actionAllowed: 'ADD' | 'REPLACE' | 'NONE' = 'NONE';
      let statusLabelFr = 'Reçu';

      switch (doc.status) {
        case 'VALIDATED':
          statusLabelFr = 'Validé';
          actionAllowed = 'NONE';
          break;
        case 'REPLACEMENT_REQUIRED':
          statusLabelFr = 'À remplacer';
          actionAllowed = 'REPLACE';
          break;
        case 'REJECTED':
          statusLabelFr = 'Non conforme';
          actionAllowed = 'REPLACE';
          break;
        case 'PENDING_REVIEW':
        case 'UPLOADED':
          statusLabelFr = 'Reçu / À vérifier';
          actionAllowed = 'NONE';
          break;
        case 'MISSING':
          statusLabelFr = 'Manquant';
          actionAllowed = 'ADD';
          break;
        default:
          statusLabelFr = 'Optionnel';
          actionAllowed = 'ADD';
          break;
      }

      return {
        documentTypeId: doc.documentTypeId,
        nameFr: doc.nameFr,
        status: doc.status,
        statusLabelFr,
        isRequired: doc.isRequired,
        actionAllowed,
        publicReplacementMessage: doc.publicReplacementMessage || null,
      };
    });

    // 4. Public Timeline
    const history = await db
      .select()
      .from(registrationStatusHistory)
      .where(eq(registrationStatusHistory.registrationId, registrationId))
      .orderBy(asc(registrationStatusHistory.createdAt));

    const timeline: PublicTimelineEvent[] = history.map((h) => {
      const mapped = this.mapPublicStatus(h.toStatus);
      return {
        date: h.createdAt.toISOString(),
        status: mapped.status,
        titleFr: mapped.labelFr,
        titleAr: mapped.labelAr,
        descriptionFr: h.publicComment || mapped.messageFr,
      };
    });

    // If history is empty, show initial submission
    if (timeline.length === 0 && row.reg.submittedAt) {
      timeline.push({
        date: row.reg.submittedAt.toISOString(),
        status: 'REQUEST_RECEIVED',
        titleFr: 'Demande envoyée',
        descriptionFr: 'Votre demande d’inscription a été soumise en ligne avec succès.',
      });
    }

    // 5. Waiting list info
    let waitingListInfo: PublicDossierResponse['waitingList'] = null;
    if (row.reg.status === 'WAITLISTED') {
      const clientWaitStatus = await WaitingListService.getClientWaitingStatus(
        registrationId,
        row.reg.schoolYearLevelId
      );
      if (clientWaitStatus) {
        waitingListInfo = {
          isWaitlisted: true,
          position: clientWaitStatus.position,
          messageFr: clientWaitStatus.displayMessageFr,
        };
      }
    }

    // 6. Tariff (only if visible)
    let tariffInfo: PublicDossierResponse['tariff'] = null;
    if (row.reg.clientTariffVisibleSnapshot && row.reg.tariffAmountSnapshot) {
      tariffInfo = {
        amount: row.reg.tariffAmountSnapshot,
        currency: row.reg.tariffCurrencySnapshot || 'DZD',
      };
    }

    return {
      registrationCode: row.reg.registrationCode,
      submissionDate: (row.reg.submittedAt || row.reg.createdAt).toISOString(),
      status: statusMapping.status,
      statusLabelFr: statusMapping.labelFr,
      statusLabelAr: statusMapping.labelAr,
      statusMessageFr: statusMapping.messageFr,
      statusMessageAr: statusMapping.messageAr,
      student: {
        fullNameFr:
          (row.student as any).fullName ||
          `${(row.student as any).firstName || (row.student as any).firstNameFr || ''} ${(row.student as any).lastName || (row.student as any).lastNameFr || ''}`.trim() ||
          'Élève',
        fullNameAr:
          (row.student as any).fullNameAr ||
          ((row.student as any).firstNameAr && (row.student as any).lastNameAr
            ? `${(row.student as any).firstNameAr} ${(row.student as any).lastNameAr}`
            : null),

        birthDate: row.student.birthDate
          ? String(row.student.birthDate).split('T')[0]
          : '',
      },

      school: {
        name: row.school.name,
        address: row.school.address || '',
        phone: row.school.phonePrimary || null,
        email: row.school.emailPrimary || null,
        gpsCoordinates:
          row.school.latitude && row.school.longitude
            ? `${row.school.latitude},${row.school.longitude}`
            : null,
      },
      level: {
        nameFr: row.level.nameFr,
        nameAr: row.level.nameAr,
      },
      academicYear: {
        name: row.academicYear.name,
      },
      waitingList: waitingListInfo,
      documents,
      timeline,
      tariff: tariffInfo,
    };
  }

  /**
   * Handles client document replacement inside verified tracking session.
   */
  static async replaceDocumentInTrackingSession(
    trackingToken: string,
    documentTypeId: string,
    fileData: { buffer: Buffer; originalFilename: string; mimeType: string; sizeBytes: number }
  ) {
    const verification = this.verifyTrackingSessionToken(trackingToken);
    if (!verification.valid || !verification.payload) {
      throw new AppError('FORBIDDEN', verification.error || 'Session de suivi expirée.');
    }

    const { registrationId } = verification.payload;

    return DocumentService.uploadDocument(
      registrationId,
      documentTypeId,
      fileData,
      'PARENT'
    );
  }

  /**
   * Public Status Mapping Helper.
   */
  static mapPublicStatus(internalStatus: string): {
    status: string;
    labelFr: string;
    labelAr: string;
    messageFr: string;
    messageAr: string;
  } {
    switch (internalStatus) {
      case 'NEW':
        return {
          status: 'REQUEST_RECEIVED',
          labelFr: 'Demande reçue',
          labelAr: 'تم استلام الطلب',
          messageFr: 'Votre demande a bien été enregistrée et est en attente d’étude.',
          messageAr: 'تم تسجيل طلبكم بنجاح وهو في انتظار المراجعة.',
        };
      case 'UNDER_REVIEW':
        return {
          status: 'UNDER_REVIEW',
          labelFr: 'En cours d’étude',
          labelAr: 'قيد الدراسة',
          messageFr: 'Votre dossier est actuellement en cours d’examen par l’équipe administrative.',
          messageAr: 'ملفكم قيد الدراسة حالياً من قبل الإدارة.',
        };
      case 'PENDING':
        return {
          status: 'PENDING',
          labelFr: 'En attente de traitement',
          labelAr: 'في انتظار المعالجة',
          messageFr: 'Votre dossier est en cours de traitement.',
          messageAr: 'ملفكم قيد المعالجة.',
        };
      case 'ACCEPTED':
        return {
          status: 'ACCEPTED',
          labelFr: 'Demande acceptée',
          labelAr: 'تم قبول الطلب',
          messageFr:
            'Votre demande a été acceptée. L’établissement vous contactera afin de finaliser les démarches.',
          messageAr: 'تم قبول طلبكم بنجاح. ستتصل بكم المؤسسة لاستكمال إجراءات التسجيل.',
        };
      case 'REFUSED':
        return {
          status: 'NOT_RETAINED',
          labelFr: 'Demande non retenue',
          labelAr: 'لم يتم قبول الطلب',
          messageFr: 'Votre demande n’a pas été retenue pour cette session.',
          messageAr: 'نعتذر، لم يتم قبول طلبكم لهذه الدورة.',
        };
      case 'WAITLISTED':
        return {
          status: 'WAITLISTED',
          labelFr: 'Liste d’attente',
          labelAr: 'قائمة الانتظار',
          messageFr: 'Ce niveau est complet. Votre demande est positionnée sur liste d’attente.',
          messageAr: 'هذا المستوى مكتمل حالياً. طلبكم مسجل في قائمة الانتظار.',
        };
      case 'CANCELLED':
        return {
          status: 'CANCELLED',
          labelFr: 'Demande annulée',
          labelAr: 'تم إلغاء الطلب',
          messageFr: 'Cette demande a été annulée.',
          messageAr: 'تم إلغاء هذا الطلب.',
        };
      default:
        return {
          status: 'UNKNOWN',
          labelFr: 'Statut en cours',
          labelAr: 'الحالة الحالية',
          messageFr: 'Traitement en cours.',
          messageAr: 'قيد المعالجة.',
        };
    }
  }

  /**
   * Foundation for lost dossier number recovery.
   */
  static async requestLostDossierRecovery(identifier: string): Promise<{ messageFr: string }> {
    // Return generic safe response without revealing whether match exists
    return {
      messageFr:
        'Si les informations correspondent à une demande enregistrée, les instructions de consultation vous parviendront. Vous pouvez également contacter directement l’établissement.',
    };
  }
}

export { RegistrationTrackingService as TrackingService };
