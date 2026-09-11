import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAdminSession, unauthorizedResponse } from '@/lib/session';

export async function GET(req: NextRequest) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  try {
    const schoolIdFilter = req.nextUrl.searchParams.get('schoolId') || undefined;

    const activeYear = await prisma.academic_years.findFirst({
      where: { is_active_default: true },
    });

    if (!activeYear) {
      return NextResponse.json({
        success: true,
        data: {
          totalRegistrations: 0,
          newRegistrations: 0,
          pendingRegistrations: 0,
          acceptedRegistrations: 0,
          refusedRegistrations: 0,
          waitlistedRegistrations: 0,
          cancelledRegistrations: 0,
          totalConfiguredCapacity: 0,
          totalAcceptedRegistrations: 0,
          totalRemainingPlaces: 0,
          fillRatePercentage: 0,
          activeSchoolsCount: 0,
          activeLevelsCount: 0,
          openLevelsCount: 0,
          fullLevelsCount: 0,
          activeAcademicYearName: 'Non configurée',
          byLevel: [],
          bySchool: [],
          alerts: [],
        },
      });
    }

    // 1. Resolve schools
    let allSchools = await prisma.schools.findMany({
      where: { is_active: true, archived_at: null },
      select: { id: true, name: true, short_name: true },
    });

    if (user.role !== 'SUPER_ADMIN') {
      const allowed = user.allowedSchoolIds || [];
      allSchools = allSchools.filter((s) => allowed.includes(s.id));
    }

    if (schoolIdFilter) {
      allSchools = allSchools.filter((s) => s.id === schoolIdFilter);
    }

    const schoolIds = allSchools.map((s) => s.id);
    if (schoolIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          totalRegistrations: 0,
          newRegistrations: 0,
          pendingRegistrations: 0,
          acceptedRegistrations: 0,
          refusedRegistrations: 0,
          waitlistedRegistrations: 0,
          cancelledRegistrations: 0,
          totalConfiguredCapacity: 0,
          totalAcceptedRegistrations: 0,
          totalRemainingPlaces: 0,
          fillRatePercentage: 0,
          activeSchoolsCount: 0,
          activeLevelsCount: 0,
          openLevelsCount: 0,
          fullLevelsCount: 0,
          activeAcademicYearName: activeYear.name,
          byLevel: [],
          bySchool: [],
          alerts: [],
        },
      });
    }

    // 2. Fetch all registrations for authorized schools and active year
    const allRegs = await prisma.registrations.findMany({
      where: {
        school_id: { in: schoolIds },
        academic_year_id: activeYear.id,
      },
      select: {
        id: true,
        status: true,
        school_id: true,
        level_id: true,
        school_year_level_id: true,
      },
    });

    const totalRegistrations = allRegs.length;
    const newRegistrations = allRegs.filter((r) => r.status === 'NEW').length;
    const pendingRegistrations = allRegs.filter((r) => r.status === 'PENDING' || r.status === 'UNDER_REVIEW').length;
    const acceptedRegistrations = allRegs.filter((r) => r.status === 'ACCEPTED').length;
    const refusedRegistrations = allRegs.filter((r) => r.status === 'REFUSED').length;
    const waitlistedRegistrations = allRegs.filter((r) => r.status === 'WAITLISTED').length;
    const cancelledRegistrations = allRegs.filter((r) => r.status === 'CANCELLED').length;

    // 3. Fetch school_year_levels
    const sylRows = await prisma.school_year_levels.findMany({
      where: {
        school_id: { in: schoolIds },
        academic_year_id: activeYear.id,
      },
      include: {
        levels: {
          include: {
            cycles: true,
          },
        },
      },
    });

    let openCount = 0;
    let fullCount = 0;
    let totalCapacity = 0;
    const alerts: Array<{
      type: 'INFO' | 'WARNING' | 'ALERT';
      title: string;
      description: string;
      count?: number;
      link?: string;
    }> = [];

    if (newRegistrations > 0) {
      alerts.push({
        type: 'INFO',
        title: `${newRegistrations} nouvelle(s) demande(s) en attente`,
        description: 'Des dossiers soumis récemment nécessitent une revue administrative.',
        count: newRegistrations,
        link: '/inscriptions?status=NEW',
      });
    }

    const byLevel = sylRows.map((syl) => {
      if (syl.registration_open) openCount++;

      const capMax = syl.capacity_mode === 'LIMITED' && syl.capacity_max !== null ? syl.capacity_max : 250;
      totalCapacity += capMax;

      const levelRegs = allRegs.filter(
        (r) => r.school_year_level_id === syl.id || r.level_id === syl.level_id
      );
      const levelAccepted = levelRegs.filter((r) => r.status === 'ACCEPTED').length;
      const levelRemaining = Math.max(0, capMax - levelAccepted);
      const fillRate = capMax > 0 ? Math.round((levelAccepted / capMax) * 100) : 0;

      if (levelAccepted >= capMax) {
        fullCount++;
        alerts.push({
          type: 'ALERT',
          title: `Niveau complet : ${syl.levels.name_fr}`,
          description: `La capacité maximale (${capMax} places) a été atteinte pour ce niveau.`,
          link: '/niveaux-capacites',
        });
      } else if (fillRate >= (syl.near_full_threshold || 85)) {
        alerts.push({
          type: 'WARNING',
          title: `Capacité critique : ${syl.levels.name_fr} (${fillRate}%)`,
          description: `Il ne reste que ${levelRemaining} place(s) disponible(s).`,
          link: '/niveaux-capacites',
        });
      }

      return {
        levelId: syl.level_id,
        levelName: syl.levels.name_fr,
        levelCode: syl.levels.code,
        cycleName: syl.levels.cycles?.name_fr || 'Cycle standard',
        capacityMax: capMax,
        acceptedCount: levelAccepted,
        remainingPlaces: levelRemaining,
        fillRate,
        totalRequests: levelRegs.length,
      };
    });

    const totalRemaining = Math.max(0, totalCapacity - acceptedRegistrations);
    const overallFillRate = totalCapacity > 0 ? Math.round((acceptedRegistrations / totalCapacity) * 100) : 0;

    const bySchool = allSchools.map((sch) => {
      const schRegs = allRegs.filter((r) => r.school_id === sch.id);
      return {
        schoolId: sch.id,
        schoolName: sch.short_name || sch.name,
        totalRequests: schRegs.length,
        acceptedCount: schRegs.filter((r) => r.status === 'ACCEPTED').length,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        totalRegistrations,
        newRegistrations,
        pendingRegistrations,
        acceptedRegistrations,
        refusedRegistrations,
        waitlistedRegistrations,
        cancelledRegistrations,
        totalConfiguredCapacity: totalCapacity,
        totalAcceptedRegistrations: acceptedRegistrations,
        totalRemainingPlaces: totalRemaining,
        fillRatePercentage: overallFillRate,
        activeSchoolsCount: schoolIds.length,
        activeLevelsCount: sylRows.length,
        openLevelsCount: openCount,
        fullLevelsCount: fullCount,
        activeAcademicYearName: activeYear.name,
        byLevel,
        bySchool,
        alerts,
      },
    });
  } catch (err: any) {
    console.error('[API] GET /api/admin/dashboard/metrics error:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
