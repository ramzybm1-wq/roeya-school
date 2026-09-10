/**
 * Public Admissions & Offerings Routes (/api/public/admission-offerings & /api/public/admissions/*)
 * Supplies dynamic real grade-level offerings, capacities, tariffs, and document requirements.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { getDb } from '@vision-school/database';
import {
  schoolYearLevels,
  schools,
  levels,
  cycles,
  academicYears,
  tariffs,
} from '@vision-school/database';
import { eq, and, asc } from 'drizzle-orm';
import { ApiResponse } from '@vision-school/shared';
import { CapacityService } from '../../services/capacity.service';
import { DocumentService } from '../../services/document.service';

const router = Router();

// GET /api/public/admission-offerings
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getDb();

    // Query active offerings visible to clients
    const rows = await db
      .select({
        syl: schoolYearLevels,
        school: schools,
        level: levels,
        cycle: cycles,
        academicYear: academicYears,
      })
      .from(schoolYearLevels)
      .innerJoin(schools, eq(schoolYearLevels.schoolId, schools.id))
      .innerJoin(levels, eq(schoolYearLevels.levelId, levels.id))
      .innerJoin(cycles, eq(levels.cycleId, cycles.id))
      .innerJoin(academicYears, eq(schoolYearLevels.academicYearId, academicYears.id))
      .where(
        and(
          eq(schoolYearLevels.isVisibleClient, true),
          eq(schools.isActive, true),
          eq(levels.isActive, true)
        )
      )
      .orderBy(asc(schoolYearLevels.displayOrder), asc(levels.displayOrder));

    const offerings = await Promise.all(
      rows.map(async (r) => {
        // Calculate capacity
        let capacityInfo = {
          isRegistrationOpen: r.syl.registrationOpen,
          operationalState: 'OPEN',
          remainingPlaces: null as number | null,
          statusLabel: r.syl.registrationOpen ? 'Inscriptions ouvertes' : 'Inscriptions fermées',
        };

        try {
          const cap = await CapacityService.getCapacitySummary(r.syl.id);
          capacityInfo = {
            isRegistrationOpen: cap.registrationOpen,
            operationalState: cap.operationalState,
            remainingPlaces: (r.syl as any).showRemainingPlacesClient ? cap.remainingPlaces : null,
            statusLabel:
              cap.operationalState === 'OPEN'
                ? 'Places disponibles'
                : cap.operationalState === 'FULL_WAITLIST'
                ? 'Liste d’attente'
                : 'Complet / Fermé',
          };
        } catch (e) {
          // fallback
        }

        // Query tariffs
        const tariffRows = await db
          .select()
          .from(tariffs)
          .where(
            and(
              eq(tariffs.schoolYearLevelId, r.syl.id),
              eq(tariffs.showClient, true),
              eq(tariffs.status, 'ACTIVE')
            )
          );

        // Query document requirements
        let requirements: any[] = [];
        try {
          requirements = await DocumentService.getPublicRequirementsForSchoolYearLevel(r.syl.id);
        } catch (e) {
          // fallback
        }

        return {
          id: r.syl.id,
          schoolId: r.school.id,
          schoolName: r.school.name,
          schoolCode: r.school.code,
          schoolCity: r.school.commune || r.school.wilaya || 'Alger',
          academicYearId: r.academicYear.id,
          academicYearName: r.academicYear.name,
          levelId: r.level.id,
          levelCode: r.level.code,
          levelNameFr: r.level.nameFr,
          levelNameAr: r.level.nameAr,
          cycleId: r.cycle.id,
          cycleCode: r.cycle.code,
          cycleNameFr: r.cycle.nameFr,
          cycleNameAr: r.cycle.nameAr,
          capacity: capacityInfo,
          tariffs: tariffRows.map((t) => ({
            id: t.id,
            amount: t.amount,
            currency: t.currency || 'DZD',
            showClient: t.showClient,
            messageFr: t.hiddenClientMessageFr,
          })),
          requirementsCount: requirements.length,
          requirements: requirements.map((req) => ({
            documentTypeId: req.documentTypeId,
            nameFr: req.nameFr,
            isRequired: req.isRequired,
          })),
        };
      })
    );

    res.json(ApiResponse.success(offerings));
  } catch (error) {
    next(error);
  }
});

export const PublicAdmissionsRouter = router;
export default router;
