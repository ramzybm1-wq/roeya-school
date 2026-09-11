import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAdminSession, unauthorizedResponse } from '@/lib/session';

export const DEFAULT_FORM = {
  id: 'default_global_form_def',
  name: 'Formulaire d’inscription Standard (Global)',
  version: 1,
  status: 'PUBLISHED',
  publishedAt: '2026-01-01T00:00:00.000Z',
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
          isVisible: true,
          isRequired: true,
          isSystemProtected: true,
          displayOrder: 1,
          width: 'HALF',
        },
        {
          id: 'fld_cycle',
          fieldKey: 'cycle_id',
          fieldType: 'SELECT',
          labelFr: 'Cycle d’enseignement',
          labelAr: 'الطور التعليمي',
          isVisible: true,
          isRequired: true,
          isSystemProtected: true,
          displayOrder: 2,
          width: 'HALF',
        },
        {
          id: 'fld_level',
          fieldKey: 'level_id',
          fieldType: 'SELECT',
          labelFr: 'Niveau scolaire',
          labelAr: 'المستوى الدراسي',
          isVisible: true,
          isRequired: true,
          isSystemProtected: true,
          displayOrder: 3,
          width: 'FULL',
        },
      ],
    },
    {
      id: 'sec_student',
      key: 'student_info',
      labelFr: 'Informations de l’élève',
      labelAr: 'معلومات التلميذ',
      displayOrder: 2,
      isVisible: true,
      fields: [
        {
          id: 'fld_st_fname_fr',
          fieldKey: 'first_name_fr',
          fieldType: 'TEXT',
          labelFr: 'Prénom (Français)',
          labelAr: 'الاسم (بالفرنسية)',
          isVisible: true,
          isRequired: true,
          isSystemProtected: true,
          displayOrder: 1,
          width: 'HALF',
        },
        {
          id: 'fld_st_lname_fr',
          fieldKey: 'last_name_fr',
          fieldType: 'TEXT',
          labelFr: 'Nom (Français)',
          labelAr: 'اللقب (بالفرنسية)',
          isVisible: true,
          isRequired: true,
          isSystemProtected: true,
          displayOrder: 2,
          width: 'HALF',
        },
        {
          id: 'fld_st_bdate',
          fieldKey: 'birth_date',
          fieldType: 'DATE',
          labelFr: 'Date de naissance',
          labelAr: 'تاريخ الميلاد',
          isVisible: true,
          isRequired: true,
          isSystemProtected: true,
          displayOrder: 3,
          width: 'HALF',
        },
        {
          id: 'fld_st_gender',
          fieldKey: 'gender',
          fieldType: 'RADIO',
          labelFr: 'Genre',
          labelAr: 'الجنس',
          isVisible: true,
          isRequired: true,
          isSystemProtected: true,
          displayOrder: 4,
          width: 'HALF',
        },
      ],
    },
    {
      id: 'sec_parent',
      key: 'parent_info',
      labelFr: 'Responsable Légal (Parent)',
      labelAr: 'الولي الشرعي',
      displayOrder: 3,
      isVisible: true,
      fields: [
        {
          id: 'fld_p_fname_fr',
          fieldKey: 'parent_first_name_fr',
          fieldType: 'TEXT',
          labelFr: 'Prénom du parent',
          labelAr: 'اسم الولي',
          isVisible: true,
          isRequired: true,
          isSystemProtected: true,
          displayOrder: 1,
          width: 'HALF',
        },
        {
          id: 'fld_p_lname_fr',
          fieldKey: 'parent_last_name_fr',
          fieldType: 'TEXT',
          labelFr: 'Nom du parent',
          labelAr: 'لقب الولي',
          isVisible: true,
          isRequired: true,
          isSystemProtected: true,
          displayOrder: 2,
          width: 'HALF',
        },
        {
          id: 'fld_p_phone',
          fieldKey: 'phone_primary',
          fieldType: 'PHONE',
          labelFr: 'Téléphone mobile',
          labelAr: 'رقم الهاتف المحمول',
          isVisible: true,
          isRequired: true,
          isSystemProtected: true,
          displayOrder: 3,
          width: 'HALF',
        },
        {
          id: 'fld_p_email',
          fieldKey: 'email',
          fieldType: 'EMAIL',
          labelFr: 'Adresse e-mail',
          labelAr: 'البريد الإلكتروني',
          isVisible: true,
          isRequired: false,
          isSystemProtected: true,
          displayOrder: 4,
          width: 'HALF',
        },
      ],
    },
  ],
};

export async function GET(req: NextRequest) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  try {
    // Try to load custom sections and fields from DB if present
    const rawSections = await prisma.$queryRawUnsafe<any[]>(`
      SELECT fs.id, fs.key, fs.label_fr as "labelFr", fs.label_ar as "labelAr", fs.display_order as "displayOrder", fs.is_visible as "isVisible"
      FROM form_sections fs
      ORDER BY fs.display_order ASC;
    `).catch(() => []);

    if (rawSections && rawSections.length > 0) {
      const rawFields = await prisma.$queryRawUnsafe<any[]>(`
        SELECT ff.id, ff.section_id as "sectionId", ff.field_key as "fieldKey", ff.field_type as "fieldType",
               ff.label_fr as "labelFr", ff.label_ar as "labelAr", ff.placeholder_fr as "placeholderFr",
               ff.is_visible as "isVisible", ff.is_required as "isRequired", ff.is_system_protected as "isSystemProtected",
               ff.display_order as "displayOrder", ff.width
        FROM form_fields ff
        ORDER BY ff.display_order ASC;
      `).catch(() => []);

      const sections = rawSections.map((s) => ({
        ...s,
        fields: rawFields
          .filter((f) => f.sectionId === s.id)
          .map((f) => ({
            ...f,
            width: f.width || 'FULL',
          })),
      }));

      return NextResponse.json({
        success: true,
        data: {
          ...DEFAULT_FORM,
          sections,
        },
      });
    }

    return NextResponse.json({ success: true, data: DEFAULT_FORM });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
