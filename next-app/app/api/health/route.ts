import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  return NextResponse.json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'ROEYA SCHOOL (Next.js / Prisma)',
    environment: process.env.NODE_ENV || 'production',
  });
}
