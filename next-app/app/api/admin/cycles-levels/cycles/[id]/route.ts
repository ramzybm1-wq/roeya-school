import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAdminSession, unauthorizedResponse } from '@/lib/session';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  const { id } = await params;

  try {
    const body = await req.json();
    const { code, nameFr, nameAr, displayOrder, isActive } = body;

    const updated = await prisma.cycles.update({
      where: { id },
      data: {
        ...(code ? { code } : {}),
        ...(nameFr ? { name_fr: nameFr } : {}),
        ...(nameAr !== undefined ? { name_ar: nameAr } : {}),
        ...(displayOrder !== undefined ? { display_order: displayOrder } : {}),
        ...(isActive !== undefined ? { is_active: isActive } : {}),
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
    await prisma.cycles.update({
      where: { id },
      data: { archived_at: new Date() },
    });

    return NextResponse.json({ success: true, message: 'Cycle archivé.' });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
