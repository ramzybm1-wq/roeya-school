import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const syls = await prisma.school_year_levels.findMany({
      where: {
        is_visible_client: true,
        schools: { is_active: true },
        levels: { is_active: true },
      },
      include: {
        schools: true,
        levels: { include: { cycles: true } },
        academic_years: true,
        tariffs: {
          where: { show_client: true, status: 'ACTIVE' },
        },
      },
      orderBy: [{ display_order: 'asc' }],
    });

    const offerings = syls.map((r) => {
      const isOpen = r.registration_open;
      const statusLabel = isOpen ? 'Inscriptions ouvertes' : 'Inscriptions fermées';

      return {
        id: r.id,
        schoolId: r.schools.id,
        schoolName: r.schools.name,
        schoolCode: r.schools.code,
        schoolCity: r.schools.commune || r.schools.wilaya || 'Alger',
        academicYearId: r.academic_years.id,
        academicYearName: r.academic_years.name,
        levelId: r.levels.id,
        levelCode: r.levels.code,
        levelNameFr: r.levels.name_fr,
        levelNameAr: r.levels.name_ar,
        cycleId: r.levels.cycles?.id || '',
        cycleNameFr: r.levels.cycles?.name_fr || '',
        cycleCode: r.levels.cycles?.code || '',
        capacity: {
          isRegistrationOpen: isOpen,
          operationalState: isOpen ? 'OPEN' : 'CLOSED',
          remainingPlaces: r.show_remaining_places ? r.capacity_max : null,
          statusLabel,
        },
        tariffs: r.tariffs.map((t) => ({
          id: t.id,
          amount: t.amount,
          currency: t.currency,
        })),
      };
    });

    return NextResponse.json({ success: true, data: offerings });
  } catch (err: any) {
    console.error('[API] GET /api/public/admission-offerings error:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
