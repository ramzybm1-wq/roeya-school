import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAdminSession, unauthorizedResponse } from '@/lib/session';

export async function GET(req: NextRequest) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  try {
    const levels = await prisma.levels.findMany({
      where: { archived_at: null },
      include: {
        cycles: true,
      },
      orderBy: [{ display_order: 'asc' }, { name_fr: 'asc' }],
    });

    const result = levels.map((lvl) => ({
      id: lvl.id,
      code: lvl.code,
      nameFr: lvl.name_fr,
      nameAr: lvl.name_ar,
      displayOrder: lvl.display_order,
      cycleId: lvl.cycle_id,
      cycleName: lvl.cycles?.name_fr || null,
      cycleCode: lvl.cycles?.code || null,
      isActive: lvl.is_active,
      createdAt: lvl.created_at,
    }));

    return NextResponse.json({ success: true, data: result });
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
    const { code, nameFr, nameAr, cycleId, displayOrder, isActive } = body;

    if (!code || !nameFr || !cycleId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Code, nom français et cycle requis.' } },
        { status: 400 }
      );
    }

    const created = await prisma.levels.create({
      data: {
        code,
        name_fr: nameFr,
        name_ar: nameAr || null,
        cycle_id: cycleId,
        display_order: displayOrder ?? 0,
        is_active: isActive !== false,
      },
    });

    return NextResponse.json({ success: true, data: created });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
