import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAdminSession, unauthorizedResponse } from '@/lib/session';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  const { id } = await params;

  try {
    const body = await req.json();
    const { isRequired, showClient, isActive, displayOrder, documentTypeId, schoolId, academicYearId, levelId } = body;

    const updates: string[] = ['updated_at = NOW()'];
    if (isRequired !== undefined) updates.push(`is_required = ${Boolean(isRequired)}`);
    if (showClient !== undefined) updates.push(`show_client = ${Boolean(showClient)}`);
    if (isActive !== undefined) updates.push(`is_active = ${Boolean(isActive)}`);
    if (displayOrder !== undefined) updates.push(`display_order = ${Number(displayOrder)}`);
    if (documentTypeId) updates.push(`document_type_id = '${documentTypeId}'::uuid`);
    if (schoolId) updates.push(`school_id = '${schoolId}'::uuid`);
    if (academicYearId) updates.push(`academic_year_id = '${academicYearId}'::uuid`);
    if (levelId !== undefined) updates.push(`level_id = ${levelId ? `'${levelId}'::uuid` : 'NULL'}`);

    const sql = `UPDATE school_level_document_requirements SET ${updates.join(', ')} WHERE id = '${id}'::uuid`;
    await prisma.$executeRawUnsafe(sql);

    return NextResponse.json({ success: true, message: 'Exigence mise à jour.' });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  const { id } = await params;

  try {
    const sql = `DELETE FROM school_level_document_requirements WHERE id = '${id}'::uuid`;
    await prisma.$executeRawUnsafe(sql);

    return NextResponse.json({ success: true, message: 'Exigence supprimée.' });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
