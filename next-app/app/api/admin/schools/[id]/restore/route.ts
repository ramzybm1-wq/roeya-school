import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAdminSession, unauthorizedResponse } from '@/lib/session';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  try {
    const existing = await prisma.schools.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Établissement introuvable.' } }, { status: 404 });
    }

    const restored = await prisma.schools.update({
      where: { id },
      data: { is_active: true, status: 'ACTIVE', archived_at: null, updated_at: new Date() },
    });

    await prisma.audit_logs.create({
      data: { user_id: user.id, action: 'SCHOOL_RESTORED', module: 'SCHOOLS', entity_type: 'SCHOOL', entity_id: id, school_id: id, result: 'SUCCESS' },
    });

    return NextResponse.json({ success: true, data: { id, restored: true, school: restored, message: 'Établissement restauré avec succès.' } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } }, { status: 500 });
  }
}
