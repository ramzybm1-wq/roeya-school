/**
 * Contact Service for VISION SCHOOL.
 * Handles public contact form submissions with anti-spam rate limiting,
 * subject whitelisting, input sanitization, and school-scoped Admin management.
 */

import { getDb } from '@vision-school/database';
import { contactMessages, schools, auditLogs } from '@vision-school/database';
import { eq, and, desc, sql } from 'drizzle-orm';
import { AppError, User } from '@vision-school/shared';
import { AuthGuard } from '@vision-school/auth';

export const ALLOWED_CONTACT_SUBJECTS = [
  'REGISTRATION',
  'TARIFF',
  'DOCUMENTS',
  'LEVELS',
  'SCHOOL_VISIT',
  'OTHER',
] as const;

export type ContactSubjectType = (typeof ALLOWED_CONTACT_SUBJECTS)[number];

export class ContactService {
  private static failedAttempts = new Map<string, { count: number; resetAt: number }>();

  /**
   * Simple HTML / script sanitization for contact messages.
   */
  static sanitizeText(input: string): string {
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .trim();
  }

  /**
   * Anti-spam rate limiting: max 5 messages per IP per 10 minutes.
   */
  private static checkRateLimit(clientIp: string) {
    const now = Date.now();
    const entry = this.failedAttempts.get(clientIp);

    if (entry && now < entry.resetAt) {
      if (entry.count >= 5) {
        throw new AppError(
          'FORBIDDEN',
          'Trop de messages envoyés récemment. Veuillez patienter quelques minutes avant de renouveler votre demande.'
        );
      }
      entry.count += 1;
    } else {
      this.failedAttempts.set(clientIp, { count: 1, resetAt: now + 10 * 60 * 1000 });
    }
  }

  /**
   * Submits a public contact message.
   */
  static async submitContactMessage(
    payload: {
      schoolId?: string | null;
      fullName: string;
      phone?: string | null;
      email?: string | null;
      subject: string;
      message: string;
    },
    clientIp = 'unknown'
  ) {
    this.checkRateLimit(clientIp);

    if (!payload.fullName || !payload.message || !payload.subject) {
      throw new AppError('VALIDATION_ERROR', 'Le nom complet, le sujet et le message sont obligatoires.');
    }

    if (!payload.phone && !payload.email) {
      throw new AppError('VALIDATION_ERROR', 'Veuillez renseigner au moins un numéro de téléphone ou une adresse email.');
    }

    // Validate subject
    if (!ALLOWED_CONTACT_SUBJECTS.includes(payload.subject as any)) {
      throw new AppError('VALIDATION_ERROR', 'Sujet de contact invalide.');
    }

    const db = getDb();

    // Verify school exists if provided
    if (payload.schoolId) {
      const [school] = await db.select().from(schools).where(eq(schools.id, payload.schoolId));
      if (!school) throw new AppError('NOT_FOUND', 'Établissement introuvable.');
    }

    const [inserted] = await db
      .insert(contactMessages)
      .values({
        schoolId: payload.schoolId || null,
        fullName: this.sanitizeText(payload.fullName),
        phone: payload.phone ? this.sanitizeText(payload.phone) : null,
        email: payload.email ? this.sanitizeText(payload.email) : null,
        subject: payload.subject,
        message: this.sanitizeText(payload.message),
        status: 'NEW',
      })
      .returning();

    return {
      success: true,
      message: 'Votre message a bien été transmis à l’administration. Nous vous répondrons dans les meilleurs délais.',
      messageId: inserted.id,
    };
  }

  /**
   * Admin: List contact messages with school scoping.
   */
  static async getAdminContactMessages(
    actor: User,
    filters?: { schoolId?: string; status?: string }
  ) {
    if (!AuthGuard.hasPermission(actor, 'contact.manage')) {
      throw new AppError('FORBIDDEN', 'Permission refusée.');
    }

    const db = getDb();
    const query = db
      .select({
        id: contactMessages.id,
        schoolId: contactMessages.schoolId,
        schoolName: schools.name,
        fullName: contactMessages.fullName,
        phone: contactMessages.phone,
        email: contactMessages.email,
        subject: contactMessages.subject,
        message: contactMessages.message,
        status: contactMessages.status,
        createdAt: contactMessages.createdAt,
      })
      .from(contactMessages)
      .leftJoin(schools, eq(contactMessages.schoolId, schools.id))
      .orderBy(desc(contactMessages.createdAt));

    const rows = await query;

    // Filter by admin school access
    return rows.filter((r) => !r.schoolId || AuthGuard.canAccessSchool(actor, r.schoolId));
  }

  /**
   * Admin: Update contact message status & assignment.
   */
  static async updateContactStatus(
    actor: User,
    messageId: string,
    status: 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'ARCHIVED',
    assignedUserId?: string
  ) {
    if (!AuthGuard.hasPermission(actor, 'contact.manage')) {
      throw new AppError('FORBIDDEN', 'Permission refusée.');
    }

    const db = getDb();
    const [msg] = await db.select().from(contactMessages).where(eq(contactMessages.id, messageId));
    if (!msg) throw new AppError('NOT_FOUND', 'Message introuvable.');

    if (msg.schoolId && !AuthGuard.canAccessSchool(actor, msg.schoolId)) {
      throw new AppError('FORBIDDEN', 'Accès refusé pour cet établissement.');
    }

    const [updated] = await db
      .update(contactMessages)
      .set({
        status,
        assignedUserId: assignedUserId || msg.assignedUserId,
        resolvedAt: status === 'RESOLVED' ? new Date() : null,
      })
      .where(eq(contactMessages.id, messageId))
      .returning();

    return updated;
  }
}
