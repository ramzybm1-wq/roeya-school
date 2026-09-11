import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAdminSession, unauthorizedResponse } from '@/lib/session';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleStatusUpdate(req, params);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleStatusUpdate(req, params);
}

async function handleStatusUpdate(
  req: NextRequest,
  paramsPromise: Promise<{ id: string }>
) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  const { id } = await paramsPromise;

  try {
    const body = await req.json();
    const { status, internalComment, publicComment, reasonCode } = body;

    if (!status) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Le statut est obligatoire.' } },
        { status: 400 }
      );
    }

    const reg = await prisma.registrations.findUnique({ where: { id } });
    if (!reg) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Dossier introuvable.' } },
        { status: 404 }
      );
    }

    const now = new Date();
    const updateData: any = {
      status,
      updated_at: now,
    };

    if (status === 'ACCEPTED') updateData.accepted_at = now;
    else if (status === 'REFUSED') updateData.refused_at = now;
    else if (status === 'CANCELLED') updateData.cancelled_at = now;
    else if (status === 'WAITLISTED') updateData.waitlisted_at = now;

    const [updated] = await prisma.$transaction([
      prisma.registrations.update({
        where: { id },
        data: updateData,
      }),
      prisma.registration_status_history.create({
        data: {
          registration_id: id,
          from_status: reg.status,
          to_status: status,
          changed_by_user_id: user.id,
          reason_code: reasonCode || null,
          internal_comment: internalComment || null,
          public_comment: publicComment || null,
        },
      }),
    ]);

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error(`[API] PUT /api/admin/registrations/${id}/status error:`, err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
