import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAdminSession, unauthorizedResponse } from '@/lib/session';
import { DEFAULT_FORM } from './default/route';

export async function GET(req: NextRequest) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  return NextResponse.json({
    success: true,
    data: [DEFAULT_FORM],
  });
}
