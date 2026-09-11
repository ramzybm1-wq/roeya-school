import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/public/levels/:id/choices
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const choices = await prisma.level_choices.findMany({
      where: {
        level_id: id,
        is_active: true,
      },
      orderBy: [{ display_order: 'asc' }, { name_fr: 'asc' }],
    });

    const result = choices.map((c) => ({
      id: c.id,
      nameFr: c.name_fr,
      nameAr: c.name_ar,
      code: c.code,
      displayOrder: c.display_order,
      levelId: c.level_id,
      isActive: c.is_active,
    }));

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    console.error(`[API] GET /api/public/levels/${id}/choices error:`, err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
