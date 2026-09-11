import { NextRequest, NextResponse } from 'next/server';
import { validateClientSession, unauthorizedResponse } from '@/lib/session';

export async function GET(req: NextRequest) {
  const user = await validateClientSession(req);
  if (!user) return unauthorizedResponse('Veuillez vous connecter pour accéder à votre espace.');

  return NextResponse.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
    },
  });
}
