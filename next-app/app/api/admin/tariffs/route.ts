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

    const where: any = {
      status: 'ACTIVE',
    };

    if (schoolId || academicYearId) {
      where.school_year_levels = {
        ...(schoolId ? { school_id: schoolId } : {}),
        ...(academicYearId ? { academic_year_id: academicYearId } : {}),
      };
    }

    const tariffsList = await prisma.tariffs.findMany({
      where,
      include: {
        school_year_levels: {
          include: {
            schools: true,
            levels: {
              include: {
                cycles: true,
              },
            },
            academic_years: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const data = tariffsList.map((t) => ({
      id: t.id,
      schoolYearLevelId: t.school_year_level_id,
      amount: t.amount,
      currency: t.currency,
      showClient: t.show_client,
      hiddenClientMessageFr: t.hidden_client_message_fr,
      hiddenClientMessageAr: t.hidden_client_message_ar,
      status: t.status,
      validFrom: t.valid_from,
      validTo: t.valid_to,
      createdAt: t.created_at,
      schoolName: t.school_year_levels.schools.name,
      schoolId: t.school_year_levels.school_id,
      levelName: t.school_year_levels.levels.name_fr,
      levelId: t.school_year_levels.level_id,
      cycleName: t.school_year_levels.levels.cycles?.name_fr || '',
      cycleCode: t.school_year_levels.levels.cycles?.code || '',
      academicYearName: t.school_year_levels.academic_years.name,
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
    const { schoolYearLevelId, schoolId, levelId, academicYearId, amount, currency = 'DZD', showClient = true } = body;

    let targetSylId = schoolYearLevelId;

    if (!targetSylId && schoolId && levelId) {
      // Find or link school_year_level
      const targetYear = academicYearId
        ? await prisma.academic_years.findUnique({ where: { id: academicYearId } })
        : await prisma.academic_years.findFirst({ where: { status: 'ACTIVE' } });

      if (!targetYear) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'Année scolaire introuvable.' } },
          { status: 404 }
        );
      }

      let syl = await prisma.school_year_levels.findFirst({
        where: {
          school_id: schoolId,
          level_id: levelId,
          academic_year_id: targetYear.id,
        },
      });

      if (!syl) {
        syl = await prisma.school_year_levels.create({
          data: {
            school_id: schoolId,
            level_id: levelId,
            academic_year_id: targetYear.id,
            capacity_max: 200,
            registration_open: true,
          },
        });
      }

      targetSylId = syl.id;
    }

    if (!targetSylId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'schoolYearLevelId ou (schoolId + levelId) requis.' } },
        { status: 400 }
      );
    }

    const created = await prisma.tariffs.create({
      data: {
        school_year_level_id: targetSylId,
        amount: Math.round(Number(amount) || 0),
        currency,
        show_client: showClient,
        status: 'ACTIVE',
        created_by: user.id,
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
