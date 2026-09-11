import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAdminSession, unauthorizedResponse } from '@/lib/session';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ choiceId: string }> }
) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  const { choiceId } = await params;

  try {
    const choice = await prisma.level_choices.findUnique({
      where: { id: choiceId },
    });

    if (!choice) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Option introuvable.' } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: choice });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ choiceId: string }> }
) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  const { choiceId } = await params;

  try {
    const body = await req.json();
    const { nameFr, nameAr, code, description, isActive } = body;

    const updated = await prisma.level_choices.update({
      where: { id: choiceId },
      data: {
        ...(nameFr ? { name_fr: nameFr } : {}),
        ...(nameAr !== undefined ? { name_ar: nameAr } : {}),
        ...(code ? { code } : {}),
        ...(description !== undefined ? { description } : {}),
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
  { params }: { params: Promise<{ choiceId: string }> }
) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  const { choiceId } = await params;

  try {
    await prisma.level_choices.update({
      where: { id: choiceId },
      data: { archived_at: new Date() },
    });

    return NextResponse.json({ success: true, message: 'Option archivée.' });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
