/**
 * Admin Dashboard Aggregation Service for VISION SCHOOL.
 * Computes live operational metrics across schools, levels, and capacities.
 * Returns real database counts for all registration statuses, capacity math,
 * breakdowns by level/school, and operational alerts.
 */

import { getDb } from '@vision-school/database';
import {
  schools,
  schoolYearLevels,
  registrations,
  academicYears,
  levels,
  cycles,
  students,
} from '@vision-school/database';
import { eq, and, sql, isNull, inArray, desc } from 'drizzle-orm';
import { User, DashboardMetrics } from '@vision-school/shared';
import { AcademicYearService } from './academic-year.service';

export type { DashboardMetrics };

export class DashboardService {
  static async getMetrics(actor: User, schoolIdFilter?: string): Promise<DashboardMetrics> {
    const db = getDb();
    let activeYear;
    try {
      activeYear = await AcademicYearService.getActiveAcademicYear();
    } catch {
      return {
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
      };
    }

    // 1. Resolve authorized schools
    let allSchools = await db
      .select({ id: schools.id, name: schools.name, shortName: schools.shortName })
      .from(schools)
      .where(and(eq(schools.isActive, true), isNull(schools.archivedAt)));

    if (actor.role !== 'SUPER_ADMIN') {
      const allowed = actor.allowedSchoolIds || [];
      allSchools = allSchools.filter((s) => allowed.includes(s.id));
    }

    if (schoolIdFilter) {
      allSchools = allSchools.filter((s) => s.id === schoolIdFilter);
    }

    const schoolIds = allSchools.map((s) => s.id);
    if (schoolIds.length === 0) {
      return {
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
      };
    }

    // 2. Query all registrations scoped to authorized schools & active year
    const allRegs = await db
      .select({
        id: registrations.id,
        status: registrations.status,
        schoolId: registrations.schoolId,
        levelId: registrations.levelId,
        schoolYearLevelId: registrations.schoolYearLevelId,
      })
      .from(registrations)
      .where(
        and(
          inArray(registrations.schoolId, schoolIds),
          eq(registrations.academicYearId, activeYear.id)
        )
      );

    const totalRegistrations = allRegs.length;
    const newRegistrations = allRegs.filter((r) => r.status === 'NEW').length;
    const pendingRegistrations = allRegs.filter((r) => r.status === 'PENDING' || r.status === 'UNDER_REVIEW').length;
    const acceptedRegistrations = allRegs.filter((r) => r.status === 'ACCEPTED').length;
    const refusedRegistrations = allRegs.filter((r) => r.status === 'REFUSED').length;
    const waitlistedRegistrations = allRegs.filter((r) => r.status === 'WAITLISTED').length;
    const cancelledRegistrations = allRegs.filter((r) => r.status === 'CANCELLED').length;

    // 3. Query school_year_levels for capacity calculation
    const sylRows = await db
      .select({
        id: schoolYearLevels.id,
        schoolId: schoolYearLevels.schoolId,
        levelId: schoolYearLevels.levelId,
        capacityMode: schoolYearLevels.capacityMode,
        capacityMax: schoolYearLevels.capacityMax,
        registrationOpen: schoolYearLevels.registrationOpen,
        nearFullThreshold: schoolYearLevels.nearFullThreshold,
        levelName: levels.nameFr,
        levelCode: levels.code,
        cycleName: cycles.nameFr,
      })
      .from(schoolYearLevels)
      .innerJoin(levels, eq(schoolYearLevels.levelId, levels.id))
      .innerJoin(cycles, eq(levels.cycleId, cycles.id))
      .where(
        and(
          inArray(schoolYearLevels.schoolId, schoolIds),
          eq(schoolYearLevels.academicYearId, activeYear.id)
        )
      );

    let openCount = 0;
    let fullCount = 0;
    let totalCapacity = 0;
    const alerts: DashboardMetrics['alerts'] = [];

    // Push new registration alert if any exist
    if (newRegistrations > 0) {
      alerts.push({
        type: 'INFO',
        title: `${newRegistrations} nouvelle(s) demande(s) en attente`,
        description: 'Des dossiers soumis récemment nécessitent une revue administrative.',
        count: newRegistrations,
        link: '/inscriptions?status=NEW',
      });
    }

    const byLevel: DashboardMetrics['byLevel'] = sylRows.map((syl) => {
      if (syl.registrationOpen) openCount++;

      const capMax = syl.capacityMode === 'LIMITED' && syl.capacityMax !== null ? syl.capacityMax : 250;
      totalCapacity += capMax;

      const levelRegs = allRegs.filter((r) => r.schoolYearLevelId === syl.id || r.levelId === syl.levelId);
      const levelAccepted = levelRegs.filter((r) => r.status === 'ACCEPTED').length;
      const levelRemaining = Math.max(0, capMax - levelAccepted);
      const fillRate = capMax > 0 ? Math.round((levelAccepted / capMax) * 100) : 0;

      if (levelAccepted >= capMax) {
        fullCount++;
        alerts.push({
          type: 'ALERT',
          title: `Niveau complet : ${syl.levelName}`,
          description: `La capacité maximale (${capMax} places) a été atteinte pour ce niveau.`,
          link: '/niveaux-capacites',
        });
      } else if (fillRate >= (syl.nearFullThreshold || 85)) {
        alerts.push({
          type: 'WARNING',
          title: `Capacité critique : ${syl.levelName} (${fillRate}%)`,
          description: `Il ne reste que ${levelRemaining} place(s) disponible(s).`,
          link: '/niveaux-capacites',
        });
      }

      return {
        levelId: syl.levelId,
        levelName: syl.levelName,
        levelCode: syl.levelCode,
        cycleName: syl.cycleName,
        capacityMax: capMax,
        acceptedCount: levelAccepted,
        remainingPlaces: levelRemaining,
        fillRate,
        totalRequests: levelRegs.length,
      };
    });

    const totalRemaining = Math.max(0, totalCapacity - acceptedRegistrations);
    const overallFillRate = totalCapacity > 0 ? Math.round((acceptedRegistrations / totalCapacity) * 100) : 0;

    // By School breakdown
    const bySchool: DashboardMetrics['bySchool'] = allSchools.map((sch) => {
      const schRegs = allRegs.filter((r) => r.schoolId === sch.id);
      return {
        schoolId: sch.id,
        schoolName: sch.shortName || sch.name,
        totalRequests: schRegs.length,
        acceptedCount: schRegs.filter((r) => r.status === 'ACCEPTED').length,
      };
    });

    return {
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
    };
  }
}
