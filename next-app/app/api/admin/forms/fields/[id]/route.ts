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
    const { labelFr, isRequired, isVisible } = body;

    const updates: string[] = ['updated_at = NOW()'];
    if (labelFr) updates.push(`label_fr = '${labelFr}'`);
    if (isRequired !== undefined) updates.push(`is_required = ${Boolean(isRequired)}`);
    if (isVisible !== undefined) updates.push(`is_visible = ${Boolean(isVisible)}`);

    await prisma.$executeRawUnsafe(`UPDATE form_fields SET ${updates.join(', ')} WHERE id = '${id}'::uuid`).catch(() => {});

    return NextResponse.json({ success: true, message: 'Champ mis à jour.' });
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
    await prisma.$executeRawUnsafe(`DELETE FROM form_fields WHERE id = '${id}'::uuid`).catch(() => {});
    return NextResponse.json({ success: true, message: 'Champ supprimé.' });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
