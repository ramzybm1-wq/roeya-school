import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, newPassword } = body;
    const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';

    if (!token || !newPassword) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Jeton ou nouveau mot de passe manquant.' } },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Le mot de passe doit contenir au moins 8 caractères.' } },
        { status: 400 }
      );
    }

    const now = new Date();
    const user = await prisma.users.findFirst({
      where: {
        password_reset_token: token,
        password_reset_expires_at: { gt: now },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Le lien de réinitialisation est invalide ou a expiré.' } },
        { status: 400 }
      );
    }

    const newHash = await hashPassword(newPassword);

    await prisma.users.update({
      where: { id: user.id },
      data: {
        password_hash: newHash,
        password_reset_token: null,
        password_reset_expires_at: null,
        failed_login_attempts: 0,
        locked_until: null,
        updated_at: now,
      },
    });

    // Revoke existing sessions
    await prisma.user_sessions.updateMany({
      where: { user_id: user.id, is_revoked: false },
      data: { is_revoked: true, revoked_at: now },
    });

    await prisma.audit_logs.create({
      data: {
        user_id: user.id,
        action: 'PASSWORD_RESET_COMPLETE',
        module: 'AUTH',
        entity_type: 'USER',
        entity_id: user.id,
        result: 'SUCCESS',
        ip_address: ipAddress,
      },
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Votre mot de passe a été réinitialisé avec succès.' },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
