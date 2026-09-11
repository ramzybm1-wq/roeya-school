import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAdminSession, unauthorizedResponse } from '@/lib/session';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  try {
    const school = await prisma.schools.findUnique({ where: { id } });
    if (!school) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Établissement introuvable.' } }, { status: 404 });
    }

    const sylRows = await prisma.school_year_levels.findMany({ where: { school_id: id } });
    const sylIds = sylRows.map(r => r.id);

    const registrationsCount = await prisma.registrations.count({ where: { school_id: id } });
    const acceptedCount = await prisma.registrations.count({ where: { school_id: id, status: 'ACCEPTED' } });

    let waitingListCount = 0;
    if (sylIds.length > 0) {
      waitingListCount = await prisma.waiting_list_entries.count({ where: { school_year_level_id: { in: sylIds } } });
    }

    const canPermanentlyDelete = registrationsCount === 0 && waitingListCount === 0;

    return NextResponse.json({
      success: true,
      data: {
        canPermanentlyDelete,
        blockingHistoricalData: { registrations: registrationsCount, acceptedRegistrations: acceptedCount, waitingListEntries: waitingListCount },
        configurationToDelete: { levelAssignments: sylRows.length, capacities: sylRows.filter(r => r.capacity_max !== null).length },
        school: { id: school.id, name: school.name, code: school.code, status: school.status },
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } }, { status: 500 });
  }
}
