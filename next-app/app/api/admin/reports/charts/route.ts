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

    const where: any = {};
    if (schoolId) where.school_id = schoolId;
    if (academicYearId) where.academic_year_id = academicYearId;

    const registrations = await prisma.registrations.findMany({
      where,
      include: {
        schools: true,
        levels: {
          include: {
            cycles: true,
          },
        },
      },
    });

    const total = registrations.length;
    const accepted = registrations.filter((r) => r.status === 'ACCEPTED').length;
    const refused = registrations.filter((r) => r.status === 'REFUSED').length;
    const waitlisted = registrations.filter((r) => r.status === 'WAITLISTED').length;
    const acceptanceRate = total > 0 ? Math.round((accepted / total) * 100) : 0;

    // By School
    const schoolMap = new Map<string, { name: string; total: number; accepted: number }>();
    for (const r of registrations) {
      const sName = r.schools?.name || 'Campus Principal';
      if (!schoolMap.has(sName)) {
        schoolMap.set(sName, { name: sName, total: 0, accepted: 0 });
      }
      const entry = schoolMap.get(sName)!;
      entry.total++;
      if (r.status === 'ACCEPTED') entry.accepted++;
    }

    // By Cycle
    const cycleMap = new Map<string, { name: string; total: number; accepted: number }>();
    for (const r of registrations) {
      const cName = r.levels?.cycles?.name_fr || 'Général';
      if (!cycleMap.has(cName)) {
        cycleMap.set(cName, { name: cName, total: 0, accepted: 0 });
      }
      const entry = cycleMap.get(cName)!;
      entry.total++;
      if (r.status === 'ACCEPTED') entry.accepted++;
    }

    // Trend (by month)
    const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    const trendMap = new Map<string, number>();
    for (const r of registrations) {
      const d = new Date(r.created_at);
      const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
      trendMap.set(key, (trendMap.get(key) || 0) + 1);
    }

    const data = {
      kpis: {
        total,
        accepted,
        refused,
        waitlisted,
        acceptanceRate,
      },
      bySchool: Array.from(schoolMap.values()),
      byCycle: Array.from(cycleMap.values()),
      trend: Array.from(trendMap.entries()).map(([label, count]) => ({ label, count })),
    };

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
