import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/public/levels/:id (where id can be schoolId or levelId)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const syls = await prisma.school_year_levels.findMany({
      where: {
        school_id: id,
        is_visible_client: true,
      },
      include: {
        levels: {
          include: {
            cycles: true,
          },
        },
      },
      orderBy: [{ display_order: 'asc' }],
    });

    const result = syls.map((syl) => ({
      id: syl.levels.id,
      levelId: syl.levels.id,
      code: syl.levels.code,
      levelCode: syl.levels.code,
      name: syl.levels.name_fr,
      nameFr: syl.levels.name_fr,
      levelNameFr: syl.levels.name_fr,
      nameAr: syl.levels.name_ar,
      levelNameAr: syl.levels.name_ar,
      displayOrder: syl.levels.display_order,
      cycleId: syl.levels.cycle_id,
      cycleName: syl.levels.cycles?.name_fr || null,
      cycleNameFr: syl.levels.cycles?.name_fr || null,
      cycleCode: syl.levels.cycles?.code || null,
      isActive: syl.levels.is_active,
      isRegistrationOpen: syl.registration_open,
      operationalState: syl.registration_open ? 'OPEN' : 'CLOSED',
      sylId: syl.id,
      schoolYearLevelId: syl.id,
      capacityMode: syl.capacity_mode,
      maxCapacity: syl.capacity_max,
      capacityMax: syl.capacity_max,
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    console.error(`[API] GET /api/public/levels/${id} error:`, err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
