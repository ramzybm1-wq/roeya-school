import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const years = await prisma.academic_years.findMany({
      where: {
        status: { not: 'ARCHIVED' },
      },
      orderBy: { start_date: 'desc' },
    });

    const result = years.map((y) => ({
      id: y.id,
      name: y.name,
      startDate: y.start_date,
      endDate: y.end_date,
      status: y.status,
      isActiveDefault: y.is_active_default,
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
