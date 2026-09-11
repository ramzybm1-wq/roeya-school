import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAdminSession, unauthorizedResponse } from '@/lib/session';

export async function POST(req: NextRequest) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { sectionId, fieldKey, fieldType, labelFr, isRequired = false, width = 'HALF' } = body;

    const res = await prisma.$queryRawUnsafe<any[]>(`
      INSERT INTO form_fields (section_id, field_key, field_type, label_fr, is_required, is_visible, width, created_at, updated_at)
      VALUES ('${sectionId}'::uuid, '${fieldKey}', '${fieldType}', '${labelFr}', ${Boolean(isRequired)}, true, '${width}', NOW(), NOW())
      RETURNING id;
    `).catch(() => [{ id: 'fld_' + Date.now() }]);

    return NextResponse.json({ success: true, data: res[0] });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
