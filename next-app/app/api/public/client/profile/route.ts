import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateClientSession, unauthorizedResponse } from '@/lib/session';

export async function PUT(req: NextRequest) {
  const user = await validateClientSession(req);
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { firstName, lastName, phone } = body;

    const updated = await prisma.users.update({
      where: { id: user.id },
      data: {
        first_name: firstName ? firstName.trim() : undefined,
        last_name: lastName ? lastName.trim() : undefined,
        phone: phone ? phone.trim() : undefined,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        email: updated.email,
        firstName: updated.first_name,
        lastName: updated.last_name,
        phone: updated.phone,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
