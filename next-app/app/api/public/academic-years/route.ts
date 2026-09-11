import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cached } from '@/lib/cache';

export async function GET() {
  try {
    const result = await cached(
      'public:academic-years',
      async () => {
        const years = await prisma.academic_years.findMany({
          where: {
            status: { not: 'ARCHIVED' },
          },
          orderBy: { start_date: 'desc' },
        });

        return years.map((y) => ({
          id: y.id,
          name: y.name,
          startDate: y.start_date,
          endDate: y.end_date,
          status: y.status,
          isActiveDefault: y.is_active_default,
        }));
      },
      { ttl: 60, tags: ['academic-years'] }
    );

    return NextResponse.json({ success: true, data: result });
  } catch (err: unknown) {
    console.error('[API] GET /api/public/academic-years error:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Une erreur interne est survenue.' } },
      { status: 500 }
    );
  }
}
