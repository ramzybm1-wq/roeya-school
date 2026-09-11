import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAdminSession, unauthorizedResponse } from '@/lib/session';

export async function GET(req: NextRequest) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  try {
    const active = await prisma.academic_years.findFirst({
      where: { is_active_default: true, archived_at: null },
    });

    if (!active) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Aucune année active.' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: active.id,
        name: active.name,
        startDate: active.start_date,
        endDate: active.end_date,
        status: active.status,
        isActiveDefault: active.is_active_default,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
