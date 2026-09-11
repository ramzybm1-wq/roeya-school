import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAdminSession, unauthorizedResponse } from '@/lib/session';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ lvlId: string }> }
) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  const { lvlId } = await params;

  try {
    const choices = await prisma.level_choices.findMany({
      where: {
        level_id: lvlId,
        archived_at: null,
      },
      orderBy: { display_order: 'asc' },
    });

    const data = choices.map((c) => ({
      id: c.id,
      levelId: c.level_id,
      code: c.code,
      nameFr: c.name_fr,
      nameAr: c.name_ar,
      description: c.description,
      isActive: c.is_active,
    }));

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
