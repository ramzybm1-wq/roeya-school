import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAdminSession, unauthorizedResponse } from '@/lib/session';

export async function GET(req: NextRequest) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  try {
    const now = new Date();
    const activeYear = await prisma.academic_years.findFirst({
      where: { is_active_default: true },
    });

    const yearId = activeYear?.id;

    // Count registrations by status
    const registrations = await prisma.registrations.groupBy({
      by: ['status'],
      _count: { id: true },
      ...(yearId ? { where: { academic_year_id: yearId } } : {}),
    });

    const statusCounts: Record<string, number> = {};
    let total = 0;
    for (const r of registrations) {
      statusCounts[r.status] = r._count.id;
      total += r._count.id;
    }

    // Count schools
    const schoolCount = await prisma.schools.count({ where: { is_active: true } });

    // Count active users
    const userCount = await prisma.users.count({ where: { status: 'ACTIVE' } });

    return NextResponse.json({
      success: true,
      data: {
        academicYear: activeYear?.name || 'N/A',
        registrations: {
          total,
          new: statusCounts['NEW'] || 0,
          underReview: statusCounts['UNDER_REVIEW'] || 0,
          pending: statusCounts['PENDING'] || 0,
          accepted: statusCounts['ACCEPTED'] || 0,
          refused: statusCounts['REFUSED'] || 0,
          waitlisted: statusCounts['WAITLISTED'] || 0,
          cancelled: statusCounts['CANCELLED'] || 0,
        },
        schools: schoolCount,
        users: userCount,
      },
    });
  } catch (err: any) {
    console.error('[API] GET /api/admin/dashboard error:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
