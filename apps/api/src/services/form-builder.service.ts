/**
 * Dynamic Registration Form Builder Service for VISION SCHOOL.
 * Handles form definitions, sections, fields, custom fields, conditional logic engine,
 * resolution hierarchy (School-specific > Global year > Global default), versioning,
 * draft/publish workflows, and submission validation with core/custom field separation.
 */

import { getDb } from '@vision-school/database';
import {
  formDefinitions,
  formSections,
  formFields,
  registrationCustomFieldValues,
  schools,
  academicYears,
  auditLogs,
} from '@vision-school/database';
import { eq, and, desc, asc, isNull, inArray, sql } from 'drizzle-orm';
import { AppError, User } from '@vision-school/shared';
import { AuthGuard } from '@vision-school/auth';
import crypto from 'crypto';

export interface ConditionItem {
  fieldKey: string;
  comparison: 'EQUALS' | 'NOT_EQUALS' | 'IS_EMPTY' | 'IS_NOT_EMPTY' | 'IN' | 'NOT_IN';
  value?: any;
}

export interface ConditionalLogicRule {
  operator?: 'AND' | 'OR';
  conditions: ConditionItem[];
}

export interface FormFieldDto {
  id: string;
  fieldKey: string;
  fieldType: string;
  labelFr: string;
  labelAr: string | null;
  placeholderFr: string | null;
  placeholderAr: string | null;
  helpTextFr: string | null;
  helpTextAr: string | null;
  isVisible: boolean;
  isRequired: boolean;
  isEditableClient: boolean;
  isSystemProtected: boolean;
  optionsJson?: Array<{ value: string; labelFr: string; labelAr?: string }> | null;
  validationJson?: Record<string, any> | null;
  conditionalLogicJson?: ConditionalLogicRule | null;
  scopeJson?: { schoolId?: string; cycleId?: string; levelId?: string; choiceId?: string } | null;
  displayOrder: number;
  width: string;
}

export interface FormSectionDto {
  id: string;
  key: string;
  labelFr: string;
  labelAr: string | null;
  descriptionFr?: string | null;
  descriptionAr?: string | null;
  displayOrder: number;
  isVisible: boolean;
  fields: FormFieldDto[];
}

export interface FormDefinitionDto {
  id: string;
  name: string;
  schoolId: string | null;
  academicYearId: string | null;
  version: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  publishedAt: Date | null;
  sections: FormSectionDto[];
  documentStepConfig?: {
    isVisible: boolean;
    labelFr: string;
    labelAr?: string | null;
    descriptionFr?: string | null;
    descriptionAr?: string | null;
    displayOrder: number;
  };
}

export class FormBuilderService {
  /**
   * Default Global Registration Form Structure.
   */
  static getDefaultGlobalFormDefinition(): FormDefinitionDto {
    return {
      id: 'default_global_form_def',
      name: 'Formulaire d’inscription Standard (Global)',
      schoolId: null,
      academicYearId: null,
      version: 1,
      status: 'PUBLISHED',
      publishedAt: new Date('2026-01-01T00:00:00Z'),
      sections: [
        {
          id: 'sec_establishment',
          key: 'establishment_level',
          labelFr: 'Établissement & Niveau',
          labelAr: 'المؤسسة والمستوى',
          displayOrder: 1,
          isVisible: true,
          fields: [
            {
              id: 'fld_school',
              fieldKey: 'school_id',
              fieldType: 'SELECT',
              labelFr: 'Établissement',
              labelAr: 'المؤسسة',
              placeholderFr: 'Sélectionnez un établissement',
              placeholderAr: 'اختر مؤسسة',
              helpTextFr: null,
              helpTextAr: null,
              isVisible: true,
              isRequired: true,
              isEditableClient: true,
              isSystemProtected: true,
              displayOrder: 1,
              width: 'full',
            },
            {
              id: 'fld_level',
              fieldKey: 'level_id',
              fieldType: 'SELECT',
              labelFr: 'Niveau scolaire demandé',
              labelAr: 'المستوى الدراسي المطلوب',
              placeholderFr: 'Sélectionnez le niveau',
              placeholderAr: 'اختر المستوى',
              helpTextFr: null,
              helpTextAr: null,
              isVisible: true,
              isRequired: true,
              isEditableClient: true,
              isSystemProtected: true,
              displayOrder: 2,
              width: 'full',
            },
          ],
        },
        {
          id: 'sec_student',
          key: 'student_info',
          labelFr: 'Informations Élève',
          labelAr: 'معلومات التلميذ',
          displayOrder: 2,
          isVisible: true,
          fields: [
            {
              id: 'fld_st_fname_fr',
              fieldKey: 'student_first_name_fr',
              fieldType: 'TEXT',
              labelFr: 'Prénom de l’élève (en français)',
              labelAr: 'الاسم (بالفرنسية)',
              placeholderFr: 'Ex: Mohamed',
              placeholderAr: null,
              helpTextFr: null,
              helpTextAr: null,
              isVisible: true,
              isRequired: true,
              isEditableClient: true,
              isSystemProtected: true,
              displayOrder: 1,
              width: 'half',
            },
            {
              id: 'fld_st_lname_fr',
              fieldKey: 'student_last_name_fr',
              fieldType: 'TEXT',
              labelFr: 'Nom de l’élève (en français)',
              labelAr: 'اللقب (بالفرنسية)',
              placeholderFr: 'Ex: Benali',
              placeholderAr: null,
              helpTextFr: null,
              helpTextAr: null,
              isVisible: true,
              isRequired: true,
              isEditableClient: true,
              isSystemProtected: true,
              displayOrder: 2,
              width: 'half',
            },
            {
              id: 'fld_st_birthdate',
              fieldKey: 'student_birth_date',
              fieldType: 'DATE',
              labelFr: 'Date de naissance',
              labelAr: 'تاريخ الميلاد',
              placeholderFr: null,
              placeholderAr: null,
              helpTextFr: null,
              helpTextAr: null,
              isVisible: true,
              isRequired: true,
              isEditableClient: true,
              isSystemProtected: true,
              displayOrder: 3,
              width: 'half',
            },
            {
              id: 'fld_st_gender',
              fieldKey: 'student_gender',
              fieldType: 'RADIO',
              labelFr: 'Sexe',
              labelAr: 'الجنس',
              placeholderFr: null,
              placeholderAr: null,
              helpTextFr: null,
              helpTextAr: null,
              isVisible: true,
              isRequired: true,
              isEditableClient: true,
              isSystemProtected: true,
              optionsJson: [
                { value: 'MALE', labelFr: 'Garçon', labelAr: 'ذكر' },
                { value: 'FEMALE', labelFr: 'Fille', labelAr: 'أنثى' },
              ],
              displayOrder: 4,
              width: 'half',
            },
            {
              id: 'fld_st_current_school',
              fieldKey: 'student_current_school',
              fieldType: 'TEXT',
              labelFr: 'Établissement actuel / précédent',
              labelAr: 'المؤسسة الحالية / السابقة',
              placeholderFr: 'Ex: École Privée Les Oliviers',
              placeholderAr: null,
              helpTextFr: null,
              helpTextAr: null,
              isVisible: true,
              isRequired: true,
              isEditableClient: true,
              isSystemProtected: false,
              displayOrder: 5,
              width: 'full',
            },
          ],
        },
        {
          id: 'sec_parent',
          key: 'parent_info',
          labelFr: 'Informations Parent / Tuteur',
          labelAr: 'معلومات الولي',
          displayOrder: 3,
          isVisible: true,
          fields: [
            {
              id: 'fld_pr_fname_fr',
              fieldKey: 'parent_first_name_fr',
              fieldType: 'TEXT',
              labelFr: 'Prénom du parent',
              labelAr: 'اسم الولي',
              placeholderFr: 'Ex: Ahmed',
              placeholderAr: null,
              helpTextFr: null,
              helpTextAr: null,
              isVisible: true,
              isRequired: true,
              isEditableClient: true,
              isSystemProtected: true,
              displayOrder: 1,
              width: 'half',
            },
            {
              id: 'fld_pr_lname_fr',
              fieldKey: 'parent_last_name_fr',
              fieldType: 'TEXT',
              labelFr: 'Nom du parent',
              labelAr: 'لقب الولي',
              placeholderFr: 'Ex: Benali',
              placeholderAr: null,
              helpTextFr: null,
              helpTextAr: null,
              isVisible: true,
              isRequired: true,
              isEditableClient: true,
              isSystemProtected: true,
              displayOrder: 2,
              width: 'half',
            },
            {
              id: 'fld_pr_phone',
              fieldKey: 'parent_phone',
              fieldType: 'PHONE',
              labelFr: 'Numéro de téléphone principal',
              labelAr: 'رقم الهاتف الرئيسي',
              placeholderFr: '0550 12 34 56',
              placeholderAr: null,
              helpTextFr: 'Sert d’identifiant pour le suivi de dossier en ligne.',
              helpTextAr: null,
              isVisible: true,
              isRequired: true,
              isEditableClient: true,
              isSystemProtected: true,
              displayOrder: 3,
              width: 'half',
            },
            {
              id: 'fld_pr_email',
              fieldKey: 'parent_email',
              fieldType: 'EMAIL',
              labelFr: 'Adresse e-mail',
              labelAr: 'البريد الإلكتروني',
              placeholderFr: 'exemple@gmail.com',
              placeholderAr: null,
              helpTextFr: null,
              helpTextAr: null,
              isVisible: true,
              isRequired: false,
              isEditableClient: true,
              isSystemProtected: false,
              displayOrder: 4,
              width: 'half',
            },
            {
              id: 'fld_pr_address',
              fieldKey: 'parent_address',
              fieldType: 'TEXT',
              labelFr: 'Adresse de résidence',
              labelAr: 'عنوان الإقامة',
              placeholderFr: 'Ex: 14 Rue Didouche Mourad, Alger',
              placeholderAr: null,
              helpTextFr: null,
              helpTextAr: null,
              isVisible: true,
              isRequired: true,
              isEditableClient: true,
              isSystemProtected: true,
              displayOrder: 5,
              width: 'full',
            },
          ],
        },
        {
          id: 'sec_documents',
          key: 'step_documents',
          labelFr: 'Étape 4 — Documents',
          labelAr: 'المرحلة 4 — الوثائق',
          descriptionFr: 'Joignez les pièces justificatives requises. Vous pouvez aussi les envoyer ultérieurement par email ou en personne.',
          descriptionAr: 'يرجى إرفاق الوثائق المطلوبة.',
          displayOrder: 4,
          isVisible: true,
          fields: [],
        },
        {
          id: 'sec_custom',
          key: 'additional_options',
          labelFr: 'Options & Services',
          labelAr: 'خيارات وخدمات إضافية',
          displayOrder: 5,
          isVisible: true,
          fields: [
            {
              id: 'fld_transport',
              fieldKey: 'uses_school_transport',
              fieldType: 'YES_NO',
              labelFr: 'L’élève utilisera-t-il le transport scolaire ?',
              labelAr: 'هل سيستفيد التلميذ من النقل المدرسي؟',
              placeholderFr: null,
              placeholderAr: null,
              helpTextFr: null,
              helpTextAr: null,
              isVisible: true,
              isRequired: false,
              isEditableClient: true,
              isSystemProtected: false,
              displayOrder: 1,
              width: 'half',
            },
            {
              id: 'fld_transport_zone',
              fieldKey: 'transport_zone',
              fieldType: 'SELECT',
              labelFr: 'Zone ou circuit de transport',
              labelAr: 'منطقة النقل',
              placeholderFr: 'Sélectionnez un circuit',
              placeholderAr: null,
              helpTextFr: null,
              helpTextAr: null,
              isVisible: true,
              isRequired: true,
              isEditableClient: true,
              isSystemProtected: false,
              optionsJson: [
                { value: 'ZONE_HYDRA_ELBIAR', labelFr: 'Circuit 1: Hydra / El Biar' },
                { value: 'ZONE_BENAKNOUN_KOUBA', labelFr: 'Circuit 2: Ben Aknoun / Kouba' },
                { value: 'ZONE_CHERAGA_DELYIBRAHIM', labelFr: 'Circuit 3: Chéraga / Dely Ibrahim' },
              ],
              conditionalLogicJson: {
                operator: 'AND',
                conditions: [
                  {
                    fieldKey: 'uses_school_transport',
                    comparison: 'EQUALS',
                    value: true,
                  },
                ],
              },
              displayOrder: 2,
              width: 'half',
            },
          ],
        },
      ],
    };
  }

  /**
   * Resolves the active published form with 3-tier hierarchy:
   * 1. School-specific published form for selected school & academic year
   * 2. School-specific published form for selected school
   * 3. Global published form for selected academic year
   * 4. Global default form
   */
  static async resolveActiveForm(
    schoolId?: string,
    academicYearId?: string,
    status: 'PUBLISHED' | 'DRAFT' = 'PUBLISHED'
  ): Promise<FormDefinitionDto> {
    const db = getDb();

    const findForm = async (targetStatus: 'PUBLISHED' | 'DRAFT') => {
      // 1. School-specific for year
      if (schoolId && academicYearId) {
        const [schoolYearForm] = await db
          .select()
          .from(formDefinitions)
          .where(
            and(
              eq(formDefinitions.schoolId, schoolId),
              eq(formDefinitions.academicYearId, academicYearId),
              eq(formDefinitions.status, targetStatus)
            )
          )
          .orderBy(desc(formDefinitions.version));

        if (schoolYearForm) return schoolYearForm.id;
      }

      // 2. School-specific global
      if (schoolId) {
        const [schoolForm] = await db
          .select()
          .from(formDefinitions)
          .where(
            and(
              eq(formDefinitions.schoolId, schoolId),
              isNull(formDefinitions.academicYearId),
              eq(formDefinitions.status, targetStatus)
            )
          )
          .orderBy(desc(formDefinitions.version));

        if (schoolForm) return schoolForm.id;
      }

      // 3. Global year-specific
      if (academicYearId) {
        const [globalYearForm] = await db
          .select()
          .from(formDefinitions)
          .where(
            and(
              isNull(formDefinitions.schoolId),
              eq(formDefinitions.academicYearId, academicYearId),
              eq(formDefinitions.status, targetStatus)
            )
          )
          .orderBy(desc(formDefinitions.version));

        if (globalYearForm) return globalYearForm.id;
      }

      // 4. Global standard
      const [globalForm] = await db
        .select()
        .from(formDefinitions)
        .where(
          and(
            isNull(formDefinitions.schoolId),
            isNull(formDefinitions.academicYearId),
            eq(formDefinitions.status, targetStatus)
          )
        )
        .orderBy(desc(formDefinitions.version));

      if (globalForm) return globalForm.id;
      return null;
    };

    if (status === 'DRAFT') {
      const draftId = await findForm('DRAFT');
      if (draftId) return this.loadFullFormDefinition(draftId);
    }

    const publishedId = await findForm('PUBLISHED');
    if (publishedId) return this.loadFullFormDefinition(publishedId);

    // 5. Seed fallback in-memory
    return this.getDefaultGlobalFormDefinition();
  }

  /**
   * Loads full form definition with nested sections and fields.
   */
  static async loadFullFormDefinition(formId: string): Promise<FormDefinitionDto> {
    const db = getDb();
    const [form] = await db.select().from(formDefinitions).where(eq(formDefinitions.id, formId));
    if (!form) throw new AppError('NOT_FOUND', 'Formulaire introuvable.');

    const sections = await db
      .select()
      .from(formSections)
      .where(eq(formSections.formDefinitionId, formId))
      .orderBy(asc(formSections.displayOrder));

    const sectionDtos: FormSectionDto[] = [];

    for (const sec of sections) {
      const fields = await db
        .select()
        .from(formFields)
        .where(eq(formFields.formSectionId, sec.id))
        .orderBy(asc(formFields.displayOrder));

      sectionDtos.push({
        id: sec.id,
        key: sec.key,
        labelFr: sec.labelFr,
        labelAr: sec.labelAr,
        descriptionFr: sec.descriptionFr,
        descriptionAr: sec.descriptionAr,
        displayOrder: sec.displayOrder,
        isVisible: sec.isVisible,
        fields: fields.map((f) => ({
          id: f.id,
          fieldKey: f.fieldKey,
          fieldType: f.fieldType,
          labelFr: f.labelFr,
          labelAr: f.labelAr,
          placeholderFr: f.placeholderFr,
          placeholderAr: f.placeholderAr,
          helpTextFr: f.helpTextFr,
          helpTextAr: f.helpTextAr,
          isVisible: f.isVisible,
          isRequired: f.isRequired,
          isEditableClient: f.isEditableClient,
          isSystemProtected: f.isSystemProtected,
          optionsJson: f.optionsJson as any,
          validationJson: f.validationJson as any,
          conditionalLogicJson: f.conditionalLogicJson as any,
          scopeJson: f.scopeJson as any,
          displayOrder: f.displayOrder,
          width: f.width || 'full',
        })),
      });
    }

    const docSection = sectionDtos.find((s) => s.key === 'step_documents');

    return {
      id: form.id,
      name: form.name,
      schoolId: form.schoolId,
      academicYearId: form.academicYearId,
      version: form.version,
      status: form.status,
      publishedAt: form.publishedAt,
      sections: sectionDtos,
      documentStepConfig: {
        isVisible: docSection ? docSection.isVisible : true,
        labelFr: docSection?.labelFr || 'Étape 4 — Documents',
        labelAr: docSection?.labelAr || 'المرحلة 4 — الوثائق',
        descriptionFr: docSection?.descriptionFr || 'Joignez les pièces justificatives requises. Vous pouvez aussi les envoyer ultérieurement par email ou en personne.',
        descriptionAr: docSection?.descriptionAr || 'يرجى إرفاق الوثائق المطلوبة.',
        displayOrder: docSection?.displayOrder || 4,
      },
    };
  }

  /**
   * Evaluates conditional logic rule against submitted form values.
   */
  static evaluateConditionalRule(rule: ConditionalLogicRule | null | undefined, formValues: Record<string, any>): boolean {
    if (!rule || !rule.conditions || rule.conditions.length === 0) {
      return true; // No conditions -> always visible
    }

    const operator = rule.operator || 'AND';

    const results = rule.conditions.map((cond) => {
      const val = formValues[cond.fieldKey];

      switch (cond.comparison) {
        case 'EQUALS':
          return val === cond.value;
        case 'NOT_EQUALS':
          return val !== cond.value;
        case 'IS_EMPTY':
          return val === undefined || val === null || val === '';
        case 'IS_NOT_EMPTY':
          return val !== undefined && val !== null && val !== '';
        case 'IN':
          return Array.isArray(cond.value) && cond.value.includes(val);
        case 'NOT_IN':
          return Array.isArray(cond.value) && !cond.value.includes(val);
        default:
          return true;
      }
    });

    return operator === 'AND' ? results.every(Boolean) : results.some(Boolean);
  }

  /**
   * Creates a new blank or cloned form definition.
   */
  static async createForm(
    payload: {
      name: string;
      schoolId?: string | null;
      academicYearId?: string | null;
      cloneFromFormId?: string;
    },
    actor: User
  ) {
    if (!AuthGuard.hasPermission(actor, 'form.manage')) {
      throw new AppError('FORBIDDEN', 'Permission refusée pour gérer les formulaires.');
    }

    if (payload.schoolId && !AuthGuard.canAccessSchool(actor, payload.schoolId)) {
      throw new AppError('FORBIDDEN', 'Accès refusé pour cet établissement.');
    }

    const db = getDb();
    const [inserted] = await db
      .insert(formDefinitions)
      .values({
        name: payload.name.trim(),
        schoolId: payload.schoolId || null,
        academicYearId: payload.academicYearId || null,
        version: 1,
        status: 'DRAFT',
        createdByUserId: actor.id,
      })
      .returning();

    // If cloning from existing form, copy sections and fields; otherwise initialize from standard template
    const source = payload.cloneFromFormId
      ? await this.loadFullFormDefinition(payload.cloneFromFormId)
      : this.getDefaultGlobalFormDefinition();

    for (const sec of source.sections) {
      const [insertedSec] = await db
        .insert(formSections)
        .values({
          formDefinitionId: inserted.id,
          key: sec.key,
          labelFr: sec.labelFr,
          labelAr: sec.labelAr,
          descriptionFr: sec.descriptionFr,
          descriptionAr: sec.descriptionAr,
          displayOrder: sec.displayOrder,
          isVisible: sec.isVisible,
        })
        .returning();

      for (const fld of sec.fields) {
        await db.insert(formFields).values({
          formSectionId: insertedSec.id,
          fieldKey: fld.fieldKey,
          fieldType: fld.fieldType as any,
          labelFr: fld.labelFr,
          labelAr: fld.labelAr,
          placeholderFr: fld.placeholderFr,
          placeholderAr: fld.placeholderAr,
          helpTextFr: fld.helpTextFr,
          helpTextAr: fld.helpTextAr,
          isVisible: fld.isVisible,
          isRequired: fld.isRequired,
          isEditableClient: fld.isEditableClient,
          isSystemProtected: fld.isSystemProtected,
          optionsJson: fld.optionsJson,
          validationJson: fld.validationJson,
          conditionalLogicJson: fld.conditionalLogicJson,
          displayOrder: fld.displayOrder,
          width: fld.width,
        });
      }
    }


    await db.insert(auditLogs).values({
      userId: actor.id,
      action: 'FORM_CREATED',
      module: 'FORMS',
      entityType: 'FORM_DEFINITION',
      entityId: inserted.id,
      schoolId: payload.schoolId || null,
      result: 'SUCCESS',
    });

    return this.loadFullFormDefinition(inserted.id);
  }

  /**
   * Publishes a form definition version, enforcing protected field safeguards.
   */
  static async publishForm(actor: User, formId: string) {
    if (!AuthGuard.hasPermission(actor, 'form.publish')) {
      throw new AppError('FORBIDDEN', 'Permission refusée pour publier des formulaires.');
    }

    const form = await this.loadFullFormDefinition(formId);

    if (form.schoolId && !AuthGuard.canAccessSchool(actor, form.schoolId)) {
      throw new AppError('FORBIDDEN', 'Accès refusé pour cet établissement.');
    }

    // Verify system protected fields are intact
    const allFields = form.sections.flatMap((s) => s.fields);
    const fieldKeys = new Set(allFields.map((f) => f.fieldKey));

    const essentialKeys = [
      'parent_phone',
      'student_birth_date',
      'student_first_name_fr',
      'student_last_name_fr',
      'school_id',
      'level_id',
    ];

    for (const key of essentialKeys) {
      if (!fieldKeys.has(key)) {
        throw new AppError(
          'VALIDATION_ERROR',
          `Impossible de publier le formulaire : le champ système obligatoire "${key}" est manquant.`
        );
      }
    }

    const db = getDb();
    const now = new Date();

    // Archive previous published version for this scope
    if (form.schoolId) {
      await db
        .update(formDefinitions)
        .set({ status: 'ARCHIVED', updatedAt: now })
        .where(
          and(
            eq(formDefinitions.schoolId, form.schoolId),
            eq(formDefinitions.status, 'PUBLISHED')
          )
        );
    } else {
      await db
        .update(formDefinitions)
        .set({ status: 'ARCHIVED', updatedAt: now })
        .where(
          and(
            isNull(formDefinitions.schoolId),
            eq(formDefinitions.status, 'PUBLISHED')
          )
        );
    }

    // Mark published
    const [published] = await db
      .update(formDefinitions)
      .set({
        status: 'PUBLISHED',
        publishedAt: now,
        updatedAt: now,
      })
      .where(eq(formDefinitions.id, formId))
      .returning();

    await db.insert(auditLogs).values({
      userId: actor.id,
      action: 'FORM_PUBLISHED',
      module: 'FORMS',
      entityType: 'FORM_DEFINITION',
      entityId: formId,
      schoolId: form.schoolId,
      result: 'SUCCESS',
    });

    return this.loadFullFormDefinition(published.id);
  }

  /**
   * Retrieves an existing DRAFT form definition for the given form definition's scope,
   * or creates a new DRAFT cloned from the current form.
   */
  static async getOrCreateDraftForForm(actor: User, formId: string): Promise<FormDefinitionDto> {
    const current = await this.loadFullFormDefinition(formId);
    if (current.status === 'DRAFT') {
      return current;
    }

    const db = getDb();
    // Check if a DRAFT already exists for this scope
    const conditions = [eq(formDefinitions.status, 'DRAFT')];
    if (current.schoolId) {
      conditions.push(eq(formDefinitions.schoolId, current.schoolId));
    } else {
      conditions.push(isNull(formDefinitions.schoolId));
    }
    if (current.academicYearId) {
      conditions.push(eq(formDefinitions.academicYearId, current.academicYearId));
    } else {
      conditions.push(isNull(formDefinitions.academicYearId));
    }

    const [existingDraft] = await db
      .select()
      .from(formDefinitions)
      .where(and(...conditions))
      .orderBy(desc(formDefinitions.version));

    if (existingDraft) {
      return this.loadFullFormDefinition(existingDraft.id);
    }

    // Clone current published form into new DRAFT
    const [inserted] = await db
      .insert(formDefinitions)
      .values({
        name: current.name,
        schoolId: current.schoolId,
        academicYearId: current.academicYearId,
        version: current.version + 1,
        status: 'DRAFT',
        createdByUserId: actor.id,
      })
      .returning();

    for (const sec of current.sections) {
      const [insertedSec] = await db
        .insert(formSections)
        .values({
          formDefinitionId: inserted.id,
          key: sec.key,
          labelFr: sec.labelFr,
          labelAr: sec.labelAr,
          descriptionFr: sec.descriptionFr,
          descriptionAr: sec.descriptionAr,
          displayOrder: sec.displayOrder,
          isVisible: sec.isVisible,
        })
        .returning();

      for (const fld of sec.fields) {
        await db.insert(formFields).values({
          formSectionId: insertedSec.id,
          fieldKey: fld.fieldKey,
          fieldType: fld.fieldType as any,
          labelFr: fld.labelFr,
          labelAr: fld.labelAr,
          placeholderFr: fld.placeholderFr,
          placeholderAr: fld.placeholderAr,
          helpTextFr: fld.helpTextFr,
          helpTextAr: fld.helpTextAr,
          isVisible: fld.isVisible,
          isRequired: fld.isRequired,
          isEditableClient: fld.isEditableClient,
          isSystemProtected: fld.isSystemProtected,
          optionsJson: fld.optionsJson,
          validationJson: fld.validationJson,
          conditionalLogicJson: fld.conditionalLogicJson,
          displayOrder: fld.displayOrder,
          width: fld.width,
        });
      }
    }

    return this.loadFullFormDefinition(inserted.id);
  }

  /**
   * Adds a section to a form definition.
   */
  static async addSection(
    actor: User,
    formDefinitionId: string,
    payload: {
      key: string;
      labelFr: string;
      labelAr?: string;
      descriptionFr?: string;
      descriptionAr?: string;
      displayOrder?: number;
      isVisible?: boolean;
    }
  ) {
    if (!AuthGuard.hasPermission(actor, 'form.manage')) {
      throw new AppError('FORBIDDEN', 'Permission refusée.');
    }

    const db = getDb();
    let targetFormId = formDefinitionId;

    const [form] = await db.select().from(formDefinitions).where(eq(formDefinitions.id, formDefinitionId));
    if (form && form.status === 'PUBLISHED') {
      const draft = await this.getOrCreateDraftForForm(actor, form.id);
      targetFormId = draft.id;
    }

    const [inserted] = await db
      .insert(formSections)
      .values({
        formDefinitionId: targetFormId,
        key: payload.key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_'),
        labelFr: payload.labelFr.trim(),
        labelAr: payload.labelAr ? payload.labelAr.trim() : null,
        descriptionFr: payload.descriptionFr ? payload.descriptionFr.trim() : null,
        descriptionAr: payload.descriptionAr ? payload.descriptionAr.trim() : null,
        displayOrder: payload.displayOrder || 10,
        isVisible: payload.isVisible !== false,
      })
      .returning();

    return inserted;
  }

  /**
   * Updates an existing section.
   */
  static async updateSection(
    actor: User,
    sectionId: string,
    payload: {
      labelFr?: string;
      labelAr?: string;
      descriptionFr?: string;
      descriptionAr?: string;
      displayOrder?: number;
      isVisible?: boolean;
    }
  ) {
    if (!AuthGuard.hasPermission(actor, 'form.manage')) {
      throw new AppError('FORBIDDEN', 'Permission refusée.');
    }

    const db = getDb();
    const [existingSec] = await db
      .select({ sec: formSections, form: formDefinitions })
      .from(formSections)
      .innerJoin(formDefinitions, eq(formSections.formDefinitionId, formDefinitions.id))
      .where(eq(formSections.id, sectionId));

    if (!existingSec) {
      throw new AppError('NOT_FOUND', 'Section introuvable.');
    }

    let targetSectionId = sectionId;
    if (existingSec.form.status === 'PUBLISHED') {
      const draft = await this.getOrCreateDraftForForm(actor, existingSec.form.id);
      const draftSec = draft.sections.find((s) => s.key === existingSec.sec.key);
      if (draftSec) {
        targetSectionId = draftSec.id;
      }
    }

    const updateValues: any = {};
    if (payload.labelFr !== undefined) updateValues.labelFr = payload.labelFr.trim();
    if (payload.labelAr !== undefined) updateValues.labelAr = payload.labelAr ? payload.labelAr.trim() : null;
    if (payload.descriptionFr !== undefined) updateValues.descriptionFr = payload.descriptionFr ? payload.descriptionFr.trim() : null;
    if (payload.descriptionAr !== undefined) updateValues.descriptionAr = payload.descriptionAr ? payload.descriptionAr.trim() : null;
    if (payload.displayOrder !== undefined) updateValues.displayOrder = payload.displayOrder;
    if (payload.isVisible !== undefined) updateValues.isVisible = payload.isVisible;

    const [updated] = await db
      .update(formSections)
      .set(updateValues)
      .where(eq(formSections.id, targetSectionId))
      .returning();

    return updated;
  }

  /**
   * Deletes an existing section (if not system protected).
   */
  static async deleteSection(actor: User, sectionId: string) {
    if (!AuthGuard.hasPermission(actor, 'form.manage')) {
      throw new AppError('FORBIDDEN', 'Permission refusée.');
    }

    const db = getDb();
    const protectedFields = await db
      .select()
      .from(formFields)
      .where(and(eq(formFields.formSectionId, sectionId), eq(formFields.isSystemProtected, true)));

    if (protectedFields.length > 0) {
      throw new AppError('FORBIDDEN', 'Cette section contient des champs système indispensables et ne peut être supprimée.');
    }

    await db.delete(formFields).where(eq(formFields.formSectionId, sectionId));
    await db.delete(formSections).where(eq(formSections.id, sectionId));
    return { success: true, message: 'Section supprimée avec succès.' };
  }

  /**
   * Adds a custom field to a section.
   */
  static async addField(
    actor: User,
    sectionId: string,
    fieldData: {
      fieldKey: string;
      fieldType: any;
      labelFr: string;
      labelAr?: string;
      placeholderFr?: string;
      helpTextFr?: string;
      isRequired?: boolean;
      isVisible?: boolean;
      optionsJson?: any;
      conditionalLogicJson?: any;
      scopeJson?: any;
      width?: string;
    }
  ) {
    if (!AuthGuard.hasPermission(actor, 'form.manage')) {
      throw new AppError('FORBIDDEN', 'Permission refusée.');
    }

    const isVis = fieldData.isVisible !== false;
    const isReq = fieldData.isRequired || false;
    if (isVis === false && isReq === true) {
      throw new AppError('BAD_REQUEST', 'Un champ masqué côté client ne peut pas être obligatoire.');
    }

    const db = getDb();
    const [sec] = await db.select().from(formSections).where(eq(formSections.id, sectionId));
    if (!sec) throw new AppError('NOT_FOUND', 'Section introuvable.');

    // Check unique field key in this section / form
    const existing = await db
      .select()
      .from(formFields)
      .where(
        and(
          eq(formFields.formSectionId, sectionId),
          eq(formFields.fieldKey, fieldData.fieldKey)
        )
      );

    if (existing.length > 0) {
      throw new AppError('VALIDATION_ERROR', `La clé de champ "${fieldData.fieldKey}" existe déjà.`);
    }

    const [inserted] = await db
      .insert(formFields)
      .values({
        formSectionId: sectionId,
        fieldKey: fieldData.fieldKey.trim(),
        fieldType: fieldData.fieldType,
        labelFr: fieldData.labelFr.trim(),
        labelAr: fieldData.labelAr || null,
        placeholderFr: fieldData.placeholderFr || null,
        helpTextFr: fieldData.helpTextFr || null,
        isRequired: isReq,
        isVisible: isVis,
        isSystemProtected: false,
        optionsJson: fieldData.optionsJson || null,
        conditionalLogicJson: fieldData.conditionalLogicJson || null,
        scopeJson: fieldData.scopeJson || null,
        width: fieldData.width || 'full',
      })
      .returning();

    return inserted;
  }

  /**
   * Deletes a field with protected field safeguard.
   */
  static async deleteField(actor: User, fieldId: string) {
    if (!AuthGuard.hasPermission(actor, 'form.manage')) {
      throw new AppError('FORBIDDEN', 'Permission refusée.');
    }

    const db = getDb();
    const [field] = await db.select().from(formFields).where(eq(formFields.id, fieldId));
    if (!field) throw new AppError('NOT_FOUND', 'Champ introuvable.');

    if (field.isSystemProtected) {
      throw new AppError(
        'FORBIDDEN',
        'Ce champ système est protégé et indispensable au fonctionnement du dossier. Il ne peut pas être supprimé.'
      );
    }

    await db.delete(formFields).where(eq(formFields.id, fieldId));
    return { success: true, message: 'Champ supprimé avec succès.' };
  }

  /**
   * Updates an existing form field (labels, visibility, required state, options, etc.).
   */
  static async updateField(
    actor: User,
    fieldId: string,
    payload: Partial<{
      labelFr: string;
      labelAr: string;
      placeholderFr: string;
      placeholderAr: string;
      helpTextFr: string;
      helpTextAr: string;
      isRequired: boolean;
      isVisible: boolean;
      displayOrder: number;
      optionsJson: any;
      conditionalLogicJson: any;
      scopeJson: any;
    }>
  ) {
    if (!AuthGuard.hasPermission(actor, 'form.manage')) {
      throw new AppError('FORBIDDEN', 'Permission refusée.');
    }

    const db = getDb();
    const [existingField] = await db
      .select({ field: formFields, sec: formSections, form: formDefinitions })
      .from(formFields)
      .innerJoin(formSections, eq(formFields.formSectionId, formSections.id))
      .innerJoin(formDefinitions, eq(formSections.formDefinitionId, formDefinitions.id))
      .where(eq(formFields.id, fieldId));

    if (!existingField) {
      throw new AppError('NOT_FOUND', 'Champ de formulaire introuvable.');
    }

    let targetFieldId = fieldId;
    if (existingField.form.status === 'PUBLISHED') {
      const draft = await this.getOrCreateDraftForForm(actor, existingField.form.id);
      const draftField = draft.sections.flatMap((s) => s.fields).find((f) => f.fieldKey === existingField.field.fieldKey);
      if (draftField) {
        targetFieldId = draftField.id;
      }
    }

    const existing = existingField.field;
    const nextIsVisible = payload.isVisible !== undefined ? payload.isVisible : existing.isVisible;
    const nextIsRequired = payload.isRequired !== undefined ? payload.isRequired : existing.isRequired;

    if (nextIsVisible === false && nextIsRequired === true) {
      throw new AppError('BAD_REQUEST', 'Un champ masqué côté client ne peut pas être obligatoire.');
    }

    const updateValues: any = { updatedAt: new Date() };
    if (payload.labelFr !== undefined) updateValues.labelFr = payload.labelFr.trim();
    if (payload.labelAr !== undefined) updateValues.labelAr = payload.labelAr ? payload.labelAr.trim() : null;
    if (payload.placeholderFr !== undefined) updateValues.placeholderFr = payload.placeholderFr;
    if (payload.placeholderAr !== undefined) updateValues.placeholderAr = payload.placeholderAr;
    if (payload.helpTextFr !== undefined) updateValues.helpTextFr = payload.helpTextFr;
    if (payload.helpTextAr !== undefined) updateValues.helpTextAr = payload.helpTextAr;
    if (payload.isRequired !== undefined) {
      if (existing.isSystemProtected && ['student_first_name', 'student_last_name', 'parent_phone'].includes(existing.fieldKey) && !payload.isRequired) {
        throw new AppError('VALIDATION_ERROR', 'Ce champ essentiel du système ne peut pas être rendu optionnel.');
      }
      updateValues.isRequired = payload.isRequired;
    }
    if (payload.isVisible !== undefined) updateValues.isVisible = payload.isVisible;
    if (payload.displayOrder !== undefined) updateValues.displayOrder = payload.displayOrder;
    if (payload.optionsJson !== undefined) updateValues.optionsJson = payload.optionsJson;
    if (payload.conditionalLogicJson !== undefined) updateValues.conditionalLogicJson = payload.conditionalLogicJson;
    if (payload.scopeJson !== undefined) updateValues.scopeJson = payload.scopeJson;

    const [updated] = await db
      .update(formFields)
      .set(updateValues)
      .where(eq(formFields.id, targetFieldId))
      .returning();

    return updated;
  }

  /**
   * Validates and parses submitted registration data against form definition.
   */
  static async validateFormSubmission(
    formId: string,
    formValues: Record<string, any>
  ): Promise<{
    coreData: {
      schoolId: string;
      levelId: string;
      parentFirstName: string;
      parentLastName: string;
      parentPhone: string;
      parentEmail?: string;
      parentAddress: string;
      studentFirstName: string;
      studentLastName: string;
      studentBirthDate: string;
      studentGender: string;
      studentCurrentSchool?: string;
    };
    customValues: Array<{ fieldKey: string; formFieldId: string; value: any }>;
  }> {
    const form = await this.loadFullFormDefinition(formId);
    const allFields = form.sections.flatMap((s) => s.fields);

    const customValues: Array<{ fieldKey: string; formFieldId: string; value: any }> = [];

    for (const field of allFields) {
      // If field itself is hidden in form builder, skip it completely
      if (!field.isVisible) {
        continue;
      }

      // If field has scoping rules, check them against submitted values
      if (field.scopeJson) {
        const scope = field.scopeJson as any;
        if (scope.schoolId && formValues.school_id && scope.schoolId !== formValues.school_id) continue;
        if (scope.levelId && formValues.level_id && scope.levelId !== formValues.level_id) continue;
      }

      const isVisible = this.evaluateConditionalRule(field.conditionalLogicJson, formValues);
      if (!isVisible) {
        continue;
      }

      const val = formValues[field.fieldKey];

      // If visible and required -> enforce
      if (field.isRequired) {
        if (val === undefined || val === null || val === '') {
          throw new AppError('VALIDATION_ERROR', `Le champ "${field.labelFr}" est obligatoire.`);
        }
      }

      // Check option constraints
      if (isVisible && field.optionsJson && val) {
        const allowed = field.optionsJson.map((o) => o.value);
        if (!allowed.includes(val)) {
          throw new AppError('VALIDATION_ERROR', `Valeur invalide pour le champ "${field.labelFr}".`);
        }
      }

      // Store custom non-system fields
      if (!field.isSystemProtected && isVisible && val !== undefined) {
        customValues.push({
          fieldKey: field.fieldKey,
          formFieldId: field.id,
          value: val,
        });
      }
    }

    return {
      coreData: {
        schoolId: formValues.school_id,
        levelId: formValues.level_id,
        parentFirstName: formValues.parent_first_name_fr,
        parentLastName: formValues.parent_last_name_fr,
        parentPhone: formValues.parent_phone,
        parentEmail: formValues.parent_email,
        parentAddress: formValues.parent_address,
        studentFirstName: formValues.student_first_name_fr,
        studentLastName: formValues.student_last_name_fr,
        studentBirthDate: formValues.student_birth_date,
        studentGender: formValues.student_gender || 'MALE',
        studentCurrentSchool: formValues.student_current_school,
      },
      customValues,
    };
  }
}
