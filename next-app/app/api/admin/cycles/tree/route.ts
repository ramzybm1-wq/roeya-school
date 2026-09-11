import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAdminSession, unauthorizedResponse } from '@/lib/session';

export async function GET(req: NextRequest) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const cycles = await prisma.cycles.findMany({
      where: includeInactive ? { archived_at: null } : { archived_at: null, is_active: true },
      orderBy: { display_order: 'asc' },
      include: {
        levels: {
          where: includeInactive ? { archived_at: null } : { archived_at: null, is_active: true },
          orderBy: { display_order: 'asc' },
        },
      },
    });

    const data = cycles.map((c) => ({
      id: c.id,
      code: c.code,
      nameFr: c.name_fr,
      nameAr: c.name_ar,
      displayOrder: c.display_order,
      isActive: c.is_active,
      levels: c.levels.map((lvl) => ({
        id: lvl.id,
        code: lvl.code,
        nameFr: lvl.name_fr,
        nameAr: lvl.name_ar,
        cycleId: lvl.cycle_id,
        displayOrder: lvl.display_order,
        isActive: lvl.is_active,
      })),
    }));

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
