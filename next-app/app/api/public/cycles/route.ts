import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const cycles = await prisma.cycles.findMany({
      where: { is_active: true },
      orderBy: { display_order: 'asc' },
    });

    const result = cycles.map((c) => ({
      id: c.id,
      code: c.code,
      nameFr: c.name_fr,
      nameAr: c.name_ar,
      displayOrder: c.display_order,
      isActive: c.is_active,
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
