/**
 * FAQ Service for VISION SCHOOL.
 * Handles public searchable multilingual FAQs, categorized topics, featured items,
 * and Admin CRUD / publishing workflows.
 */

import { getDb } from '@vision-school/database';
import { faqItems, schools, auditLogs } from '@vision-school/database';
import { eq, and, desc, asc, ilike, or, isNull } from 'drizzle-orm';
import { AppError, User } from '@vision-school/shared';
import { AuthGuard } from '@vision-school/auth';

export class FAQService {
  /**
   * Default public FAQ seed items (if database is empty).
   */
  static getDefaultFaqs() {
    return [
      {
        id: 'faq_1',
        category: 'INSCRIPTION',
        questionFr: 'Comment se déroule la procédure d’inscription en ligne ?',
        questionAr: 'كيف تتم إجراءات التسجيل عبر الإنترنت؟',
        answerFr:
          'La demande s’effectue en 4 étapes simples : sélection de l’établissement et du niveau, saisie des informations de l’élève et du parent, transmission des pièces justificatives au format PDF/image, puis réception de votre code de dossier pour le suivi.',
        answerAr:
          'تتم عملية التسجيل في 4 خطوات بسيطة: اختيار المؤسسة والمستوى، ملء بيانات التلميذ والولي، رفع الوثائق المطلوبة بصيغة PDF أو صورة، ثم الحصول على رمز الملف للمتابعة.',
        isFeatured: true,
        displayOrder: 1,
      },
      {
        id: 'faq_2',
        category: 'DOCUMENTS',
        questionFr: 'Quels sont les documents obligatoires pour déposer une demande ?',
        questionAr: 'ما هي الوثائق الإلزامية لإيداع الطلب؟',
        answerFr:
          'Les documents de base comprennent l’acte de naissance (extrait d’acte 12), une photo d’identité récente, les bulletins de l’année précédente et le carnet de vaccination à jour.',
        answerAr:
          'تشمل الوثائق الأساسية: شهادة الميلاد (عقد رقم 12)، صورة شمسية حديثة، كشوف نقاط العام السابق ودفتر التلقيح.',
        isFeatured: true,
        displayOrder: 2,
      },
      {
        id: 'faq_3',
        category: 'LISTE_ATTENTE',
        questionFr: 'Que signifie le statut "Liste d’attente" ?',
        questionAr: 'ماذا تعني حالة "قائمة الانتظار"؟',
        answerFr:
          'Lorsque la capacité maximale d’une classe est atteinte, votre dossier est automatiquement placé en liste d’attente selon l’ordre chronologique de soumission (premier arrivé, premier servi). Vous serez contacté dès libération d’une place.',
        answerAr:
          'عند اكتمال الطاقة الاستيعابية للقسم، يوضع ملفكم تلقائياً في قائمة الانتظار حسب الترتيب الزمني للتسجيل. سيتم التواصل معكم فور توفر منصب شاغر.',
        isFeatured: true,
        displayOrder: 3,
      },
      {
        id: 'faq_4',
        category: 'SERVICES',
        questionFr: 'Proposez-vous un service de transport et de cantine scolaire ?',
        questionAr: 'هل تتوفر خدمات النقل والإطعام المدرسي؟',
        answerFr:
          'Oui, nos campus disposent de circuits de transport sécurisés couvrant plusieurs communes d’Alger ainsi que d’un service de restauration équilibrée préparé quotidiennement sur place.',
        answerAr:
          'نعم، توفر مؤسساتنا حافلات نقل مدرسي تغطي عدة مناطق بالجزائر العاصمة بالإضافة إلى مطعم مدرسي يقدم وجبات صحية يومية.',
        isFeatured: false,
        displayOrder: 4,
      },
    ];
  }

  /**
   * Public: List and search published FAQs.
   */
  static async getPublicFaqs(filters?: {
    schoolId?: string;
    category?: string;
    search?: string;
    isFeatured?: boolean;
    language?: string;
  }) {
    const db = getDb();
    let query = db
      .select()
      .from(faqItems)
      .where(eq(faqItems.status, 'PUBLISHED'))
      .orderBy(asc(faqItems.displayOrder), desc(faqItems.createdAt));

    const rows = await query;

    let results = rows;

    // Filter by school (or global)
    if (filters?.schoolId) {
      results = results.filter((f) => !f.schoolId || f.schoolId === filters.schoolId);
    }

    // Filter by category
    if (filters?.category) {
      results = results.filter((f) => f.category === filters.category);
    }

    // Filter by featured
    if (filters?.isFeatured !== undefined) {
      results = results.filter((f) => f.isFeatured === filters.isFeatured);
    }

    // Filter by search keyword
    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      results = results.filter(
        (f) =>
          f.questionFr.toLowerCase().includes(q) ||
          f.answerFr.toLowerCase().includes(q) ||
          (f.questionAr && f.questionAr.toLowerCase().includes(q)) ||
          (f.answerAr && f.answerAr.toLowerCase().includes(q)) ||
          (Array.isArray(f.keywordsJson) &&
            (f.keywordsJson as string[]).some((k) => k.toLowerCase().includes(q)))
      );
    }

    if (results.length === 0 && !filters?.search && !filters?.category) {
      return this.getDefaultFaqs();
    }

    return results.map((f) => ({
      id: f.id,
      category: f.category,
      questionFr: f.questionFr,
      questionAr: f.questionAr,
      answerFr: f.answerFr,
      answerAr: f.answerAr,
      isFeatured: f.isFeatured,
      displayOrder: f.displayOrder,
    }));
  }

  /**
   * Admin: Create FAQ item.
   */
  static async createFaq(
    actor: User,
    payload: {
      schoolId?: string | null;
      category?: string;
      questionFr: string;
      questionAr?: string;
      answerFr: string;
      answerAr?: string;
      keywords?: string[];
      isFeatured?: boolean;
      displayOrder?: number;
    }
  ) {
    if (!AuthGuard.hasPermission(actor, 'content.manage')) {
      throw new AppError('FORBIDDEN', 'Permission refusée.');
    }

    if (payload.schoolId && !AuthGuard.canAccessSchool(actor, payload.schoolId)) {
      throw new AppError('FORBIDDEN', 'Accès refusé pour cet établissement.');
    }

    const db = getDb();
    const [inserted] = await db
      .insert(faqItems)
      .values({
        schoolId: payload.schoolId || null,
        category: payload.category || 'GENERAL',
        questionFr: payload.questionFr.trim(),
        questionAr: payload.questionAr?.trim() || null,
        answerFr: payload.answerFr.trim(),
        answerAr: payload.answerAr?.trim() || null,
        keywordsJson: payload.keywords || [],
        isFeatured: payload.isFeatured || false,
        displayOrder: payload.displayOrder || 0,
        status: 'PUBLISHED',
        publishedAt: new Date(),
      })
      .returning();

    return inserted;
  }
}
