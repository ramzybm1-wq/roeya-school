import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAdminSession, unauthorizedResponse } from '@/lib/session';

export async function GET(req: NextRequest) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  try {
    const levels = await prisma.levels.findMany({
      where: { archived_at: null },
      orderBy: { display_order: 'asc' },
      include: { cycles: true },
    });

    return NextResponse.json({
      success: true,
      data: levels.map((lvl) => ({
        id: lvl.id,
        code: lvl.code,
        nameFr: lvl.name_fr,
        nameAr: lvl.name_ar,
        cycleId: lvl.cycle_id,
        cycleNameFr: lvl.cycles?.name_fr,
        displayOrder: lvl.display_order,
        isActive: lvl.is_active,
      })),
    });
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
    const { cycleId, code, nameFr, nameAr, displayOrder, isActive } = body;

    const created = await prisma.levels.create({
      data: {
        cycle_id: cycleId,
        code,
        name_fr: nameFr,
        name_ar: nameAr || null,
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
