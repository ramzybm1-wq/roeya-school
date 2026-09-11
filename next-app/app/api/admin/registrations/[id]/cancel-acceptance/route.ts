import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAdminSession, unauthorizedResponse } from '@/lib/session';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  const { id } = await params;

  try {
    const body = await req.json().catch(() => ({}));
    const reason = body.reason || 'Annulation manuelle de validation';

    const reg = await prisma.registrations.findUnique({ where: { id } });
    if (!reg) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Dossier introuvable.' } },
        { status: 404 }
      );
    }

    const now = new Date();
    await prisma.$transaction([
      prisma.registrations.update({
        where: { id },
        data: {
          status: 'PENDING',
          accepted_at: null,
          updated_at: now,
        },
      }),
      prisma.registration_status_history.create({
        data: {
          registration_id: id,
          from_status: reg.status,
          to_status: 'PENDING',
          changed_by_user_id: user.id,
          internal_comment: `Annulation de validation : ${reason}`,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: { message: 'Validation annulée, dossier repassé en attente.' },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
