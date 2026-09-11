import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: 'READY',
      checks: {
        database: 'CONNECTED',
        neon: 'ACTIVE',
        prisma: 'HEALTHY',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        status: 'NOT_READY',
        checks: { database: 'ERROR' },
        error: err.message,
      },
      { status: 503 }
    );
  }
}
