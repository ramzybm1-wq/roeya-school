import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAdminSession, unauthorizedResponse } from '@/lib/session';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  const { id } = await params;

  try {
    const syl = await prisma.school_year_levels.findUnique({
      where: { id },
      include: {
        schools: true,
        levels: true,
        _count: {
          select: {
            registrations: {
              where: { status: 'ACCEPTED' },
            },
          },
        },
      },
    });

    if (!syl) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Niveau introuvable.' } },
        { status: 404 }
      );
    }

    const acceptedCount = syl._count.registrations;
    const capacityMax = syl.capacity_max ?? 200;
    const remainingPlaces = Math.max(0, capacityMax - acceptedCount);

    return NextResponse.json({
      success: true,
      data: {
        id: syl.id,
        capacityMax,
        acceptedCount,
        remainingPlaces,
        registrationOpen: syl.registration_open,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  const { id } = await params;

  try {
    const body = await req.json();
    const { capacityMax, registrationOpen } = body;

    const updated = await prisma.school_year_levels.update({
      where: { id },
      data: {
        ...(capacityMax !== undefined ? { capacity_max: Number(capacityMax) } : {}),
        ...(registrationOpen !== undefined ? { registration_open: !!registrationOpen } : {}),
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return PUT(req, { params });
}
