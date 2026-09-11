import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { generateSecureToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();
    const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';

    if (email) {
      const user = await prisma.users.findUnique({
        where: { email },
      });

      if (user && user.status === 'ACTIVE') {
        const resetToken = `rst_${generateSecureToken(24)}`;
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour

        await prisma.users.update({
          where: { id: user.id },
          data: {
            password_reset_token: resetToken,
            password_reset_expires_at: expiresAt,
            updated_at: now,
          },
        });

        await prisma.audit_logs.create({
          data: {
            user_id: user.id,
            action: 'PASSWORD_RESET_REQUEST',
            module: 'AUTH',
            entity_type: 'USER',
            entity_id: user.id,
            result: 'SUCCESS',
            ip_address: ipAddress,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'Si cette adresse correspond à un compte, un email de réinitialisation a été envoyé.',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
