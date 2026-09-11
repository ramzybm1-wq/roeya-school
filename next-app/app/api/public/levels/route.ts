import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/public/levels  or  GET /api/public/levels/:schoolId
export async function GET(req: NextRequest) {
  try {
    const levels = await prisma.levels.findMany({
      where: { is_active: true },
      include: { cycles: true },
      orderBy: [{ display_order: 'asc' }, { name_fr: 'asc' }],
    });

    const result = levels.map((l) => ({
      id: l.id,
      code: l.code,
      nameFr: l.name_fr,
      nameAr: l.name_ar,
      displayOrder: l.display_order,
      cycleId: l.cycle_id,
      cycleName: l.cycles?.name_fr || null,
      cycleCode: l.cycles?.code || null,
      isActive: l.is_active,
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    console.error('[API] GET /api/public/levels error:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
