import { NextRequest, NextResponse } from 'next/server';
import { validateAdminSession, unauthorizedResponse } from '@/lib/session';

export async function POST(req: NextRequest) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  return NextResponse.json({
    success: true,
    message: 'Formulaire publié avec succès.',
  });
}
