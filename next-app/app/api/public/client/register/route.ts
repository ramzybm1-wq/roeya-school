import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, generateSecureToken, hashToken, ABSOLUTE_TIMEOUT_MS } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || '').trim().toLowerCase();
    const password = (body.password || '').trim();
    const firstName = (body.firstName || '').trim();
    const lastName = (body.lastName || '').trim();
    const phone = (body.phone || '').trim();
    const ipAddress = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Adresse email invalide.' } },
        { status: 400 }
      );
    }
    if (!firstName || !lastName) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Le prénom et le nom sont requis.' } },
        { status: 400 }
      );
    }
    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Le mot de passe doit comporter au moins 6 caractères.' } },
        { status: 400 }
      );
    }

    const existing = await prisma.users.findUnique({ where: { email } });
    let userId: string;

    if (existing) {
      if (existing.password_hash) {
        return NextResponse.json(
          { success: false, error: { code: 'CONFLICT', message: 'Un compte avec cette adresse email existe déjà. Veuillez vous connecter.' } },
          { status: 409 }
        );
      }
      const newHash = await hashPassword(password);
      await prisma.users.update({
        where: { id: existing.id },
        data: {
          first_name: firstName,
          last_name: lastName,
          phone: phone || existing.phone,
          password_hash: newHash,
          status: 'ACTIVE',
          updated_at: new Date(),
        },
      });
      userId = existing.id;
    } else {
      const newHash = await hashPassword(password);
      const newUser = await prisma.users.create({
        data: {
          email,
          first_name: firstName,
          last_name: lastName,
          phone: phone || null,
          password_hash: newHash,
          status: 'ACTIVE',
        },
      });
      userId = newUser.id;
    }

    // Issue session
    const rawToken = generateSecureToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + ABSOLUTE_TIMEOUT_MS);

    await prisma.user_sessions.create({
      data: {
        user_id: userId,
        token_hash: tokenHash,
        device_info: userAgent ? userAgent.substring(0, 100) : 'Appareil inconnu',
        ip_address: ipAddress,
        user_agent: userAgent,
        is_revoked: false,
        expires_at: expiresAt,
      },
    });

    const response = NextResponse.json({
      success: true,
      data: {
        token: rawToken,
        expiresAt,
        user: {
          id: userId,
          email,
          firstName,
          lastName,
          phone,
        },
      },
    });

    response.cookies.set('vs_client_session', rawToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60,
    });

    return response;
  } catch (err: any) {
    console.error('[API] POST /api/public/client/register error:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
