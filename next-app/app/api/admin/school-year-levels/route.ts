import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAdminSession, unauthorizedResponse } from '@/lib/session';

export async function GET(req: NextRequest) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');
    const academicYearId = searchParams.get('academicYearId');
    const cycleId = searchParams.get('cycleId');

    const where: any = {
      archived_at: null,
    };

    if (schoolId) where.school_id = schoolId;
    if (academicYearId) where.academic_year_id = academicYearId;
    if (cycleId) {
      where.levels = { cycle_id: cycleId };
    }

    const items = await prisma.school_year_levels.findMany({
      where,
      include: {
        schools: true,
        academic_years: true,
        levels: {
          include: {
            cycles: true,
          },
        },
        _count: {
          select: {
            registrations: {
              where: {
                status: 'ACCEPTED',
              },
            },
          },
        },
      },
      orderBy: [
        { schools: { name: 'asc' } },
        { display_order: 'asc' },
      ],
    });

    const data = items.map((item) => {
      const acceptedCount = item._count.registrations;
      const capacityMax = item.capacity_max ?? 200;
      const remainingPlaces = Math.max(0, capacityMax - acceptedCount);
      const fillRatePercent = capacityMax > 0 ? Math.min(100, Math.round((acceptedCount / capacityMax) * 100)) : 0;

      return {
        id: item.id,
        schoolId: item.school_id,
        schoolName: item.schools.name,
        academicYearId: item.academic_year_id,
        academicYearName: item.academic_years.name,
        levelId: item.level_id,
        levelNameFr: item.levels.name_fr,
        levelNameAr: item.levels.name_ar,
        levelCode: item.levels.code,
        cycleId: item.levels.cycle_id,
        cycleNameFr: item.levels.cycles?.name_fr || '',
        registrationOpen: item.registration_open,
        isVisibleClient: item.is_visible_client,
        capacity: {
          capacityMax,
          acceptedCount,
          remainingPlaces,
          fillRatePercent,
          capacityMode: item.capacity_mode,
        },
        capacityMax,
        acceptedCount,
        remainingPlaces,
        fillRatePercent,
        createdAt: item.created_at,
      };
    });

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
    const { schoolId, levelId, academicYearId, capacityMax = 200, registrationOpen = true, isVisibleClient = true } = body;

    if (!schoolId || !levelId || !academicYearId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'schoolId, levelId et academicYearId requis.' } },
        { status: 400 }
      );
    }

    const created = await prisma.school_year_levels.create({
      data: {
        school_id: schoolId,
        level_id: levelId,
        academic_year_id: academicYearId,
        capacity_max: Number(capacityMax),
        registration_open: !!registrationOpen,
        is_visible_client: !!isVisibleClient,
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
