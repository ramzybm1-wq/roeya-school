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
    const tariff = await prisma.tariffs.findUnique({
      where: { id },
      include: {
        school_year_levels: {
          include: {
            schools: true,
            levels: true,
            academic_years: true,
          },
        },
      },
    });

    if (!tariff) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Tarif non trouvé.' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: tariff.id,
        schoolYearLevelId: tariff.school_year_level_id,
        amount: tariff.amount,
        currency: tariff.currency,
        showClient: tariff.show_client,
        hiddenClientMessageFr: tariff.hidden_client_message_fr,
        hiddenClientMessageAr: tariff.hidden_client_message_ar,
        schoolName: tariff.school_year_levels.schools.name,
        schoolId: tariff.school_year_levels.school_id,
        levelName: tariff.school_year_levels.levels.name_fr,
        levelId: tariff.school_year_levels.level_id,
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
    const { amount, currency, showClient, hiddenClientMessageFr, hiddenClientMessageAr, status } = body;

    const updated = await prisma.tariffs.update({
      where: { id },
      data: {
        ...(amount !== undefined ? { amount: Math.round(Number(amount)) } : {}),
        ...(currency ? { currency } : {}),
        ...(showClient !== undefined ? { show_client: showClient } : {}),
        ...(hiddenClientMessageFr !== undefined ? { hidden_client_message_fr: hiddenClientMessageFr } : {}),
        ...(hiddenClientMessageAr !== undefined ? { hidden_client_message_ar: hiddenClientMessageAr } : {}),
        ...(status ? { status } : {}),
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
    await prisma.tariffs.update({
      where: { id },
      data: { status: 'ARCHIVED', updated_at: new Date() },
    });

    return NextResponse.json({ success: true, message: 'Tarif archivé avec succès.' });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
