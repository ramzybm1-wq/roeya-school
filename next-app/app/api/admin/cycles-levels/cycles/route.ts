import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAdminSession, unauthorizedResponse } from '@/lib/session';

export async function GET(req: NextRequest) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  try {
    const cycles = await prisma.cycles.findMany({
      where: { archived_at: null },
      orderBy: { display_order: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: cycles.map((c) => ({
        id: c.id,
        code: c.code,
        nameFr: c.name_fr,
        nameAr: c.name_ar,
        displayOrder: c.display_order,
        isActive: c.is_active,
        createdAt: c.created_at,
      })),
    });
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
    const { code, nameFr, nameAr, displayOrder, isActive } = body;

    const created = await prisma.cycles.create({
      data: {
        code,
        name_fr: nameFr,
        name_ar: nameAr || null,
        display_order: displayOrder ?? 0,
        is_active: isActive !== false,
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
