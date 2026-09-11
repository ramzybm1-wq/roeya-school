import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAdminSession, unauthorizedResponse } from '@/lib/session';
import { invalidateCache } from '@/lib/cache';

export async function GET(req: NextRequest) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  try {
    const years = await prisma.academic_years.findMany({
      where: { archived_at: null },
      orderBy: { start_date: 'desc' },
    });

    const result = years.map((y) => ({
      id: y.id,
      name: y.name,
      startDate: y.start_date,
      endDate: y.end_date,
      status: y.status,
      isActiveDefault: y.is_active_default,
      createdAt: y.created_at,
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (err: unknown) {
    console.error('[API] GET /api/admin/academic-years error:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Une erreur interne est survenue.' } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { name, startDate, endDate, status, isActiveDefault } = body;

    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Nom, date de début et date de fin requis.' } },
        { status: 400 }
      );
    }

    const created = await prisma.academic_years.create({
      data: {
        name,
        start_date: new Date(startDate),
        end_date: new Date(endDate),
        status: status || 'DRAFT',
        is_active_default: isActiveDefault || false,
      },
    });

    invalidateCache('academic-years');
    return NextResponse.json({ success: true, data: created });
  } catch (err: unknown) {
    console.error('[API] POST /api/admin/academic-years error:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Une erreur interne est survenue.' } },
      { status: 500 }
    );
  }
}
