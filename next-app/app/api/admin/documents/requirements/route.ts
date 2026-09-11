import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAdminSession, unauthorizedResponse } from '@/lib/session';

export async function GET(req: NextRequest) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');

    let query = `
      SELECT 
        r.id,
        r.school_id as "schoolId",
        r.academic_year_id as "academicYearId",
        r.level_id as "levelId",
        r.document_type_id as "documentTypeId",
        r.is_required as "isRequired",
        r.show_client as "showClient",
        r.is_active as "isActive",
        r.display_order as "displayOrder",
        dt.name_fr as "docTypeNameFr",
        dt.name_ar as "docTypeNameAr",
        s.name as "schoolName",
        l.name_fr as "levelName"
      FROM school_level_document_requirements r
      LEFT JOIN document_types dt ON r.document_type_id = dt.id
      LEFT JOIN schools s ON r.school_id = s.id
      LEFT JOIN levels l ON r.level_id = l.id
    `;

    if (schoolId) {
      query += ` WHERE (r.school_id = '${schoolId}'::uuid OR r.school_id IS NULL)`;
    }
    query += ` ORDER BY r.display_order ASC, dt.name_fr ASC`;

    const rawRows = await prisma.$queryRawUnsafe<any[]>(query);

    const data = rawRows.map((row) => ({
      id: row.id,
      schoolId: row.schoolId,
      schoolName: row.schoolName || 'Tous les établissements',
      academicYearId: row.academicYearId,
      levelId: row.levelId,
      levelName: row.levelName || 'Tous les niveaux',
      documentTypeId: row.documentTypeId,
      docTypeNameFr: row.docTypeNameFr || 'Document',
      docTypeNameAr: row.docTypeNameAr,
      typeName: row.docTypeNameFr || 'Document',
      isRequired: Boolean(row.isRequired),
      showClient: row.showClient !== false,
      isActive: row.isActive !== false,
      displayOrder: row.displayOrder ?? 0,
      allowedExtensions: ['pdf', 'jpg', 'png'],
      maxFileSizeBytes: 5242880,
    }));

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const {
      documentTypeId,
      schoolId,
      academicYearId,
      levelId,
      isRequired = true,
      showClient = true,
      isActive = true,
      displayOrder = 0,
    } = body;

    if (!documentTypeId || !schoolId || !academicYearId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Document, établissement et année scolaire requis.' } },
        { status: 400 }
      );
    }

    const insertSql = `
      INSERT INTO school_level_document_requirements 
        (school_id, academic_year_id, level_id, document_type_id, is_required, show_client, is_active, display_order, created_at, updated_at)
      VALUES 
        ('${schoolId}'::uuid, '${academicYearId}'::uuid, ${levelId ? `'${levelId}'::uuid` : 'NULL'}, '${documentTypeId}'::uuid, ${Boolean(isRequired)}, ${Boolean(showClient)}, ${Boolean(isActive)}, ${Number(displayOrder)}, NOW(), NOW())
      RETURNING id;
    `;

    const result = await prisma.$queryRawUnsafe<any[]>(insertSql);
    return NextResponse.json({ success: true, data: result[0] });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
