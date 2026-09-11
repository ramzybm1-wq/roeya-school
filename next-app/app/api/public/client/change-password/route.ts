import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateClientSession, unauthorizedResponse } from '@/lib/session';
import { verifyPassword, hashPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const user = await validateClientSession(req);
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { oldPassword, newPassword } = body;

    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Ancien et nouveau mot de passe requis.' } },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Le mot de passe doit comporter au moins 6 caractères.' } },
        { status: 400 }
      );
    }

    const dbUser = await prisma.users.findUnique({ where: { id: user.id } });
    if (!dbUser || !dbUser.password_hash) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Utilisateur introuvable.' } },
        { status: 404 }
      );
    }

    const isValid = await verifyPassword(oldPassword, dbUser.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Ancien mot de passe incorrect.' } },
        { status: 401 }
      );
    }

    const newHash = await hashPassword(newPassword);
    await prisma.users.update({
      where: { id: user.id },
      data: {
        password_hash: newHash,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Mot de passe modifié avec succès.' },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
