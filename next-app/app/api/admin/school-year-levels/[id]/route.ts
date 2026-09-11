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
    const item = await prisma.school_year_levels.findUnique({
      where: { id },
      include: {
        schools: true,
        academic_years: true,
        levels: {
          include: {
            cycles: true,
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Niveau d\'établissement introuvable.' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: item });
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
    const { capacityMax, registrationOpen, isVisibleClient, waitingListEnabled } = body;

    const updated = await prisma.school_year_levels.update({
      where: { id },
      data: {
        ...(capacityMax !== undefined ? { capacity_max: Number(capacityMax) } : {}),
        ...(registrationOpen !== undefined ? { registration_open: !!registrationOpen } : {}),
        ...(isVisibleClient !== undefined ? { is_visible_client: !!isVisibleClient } : {}),
        ...(waitingListEnabled !== undefined ? { waiting_list_enabled: !!waitingListEnabled } : {}),
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  const { id } = await params;

  try {
    await prisma.school_year_levels.update({
      where: { id },
      data: { archived_at: new Date() },
    });

    return NextResponse.json({ success: true, data: { message: 'Niveau retiré avec succès.' } });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
