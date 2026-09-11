import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAdminSession, unauthorizedResponse } from '@/lib/session';

export async function GET(req: NextRequest) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  try {
    const list = await prisma.education_transitions.findMany({
      where: { is_active: true },
      include: {
        levels_education_transitions_from_level_idTolevels: true,
        levels_education_transitions_to_level_idTolevels: true,
        level_choices_education_transitions_from_choice_idTolevel_choices: true,
        level_choices_education_transitions_to_choice_idTolevel_choices: true,
      },
      orderBy: { created_at: 'desc' },
    });

    const data = list.map((t) => ({
      id: t.id,
      fromLevelId: t.from_level_id,
      fromLevelName: t.levels_education_transitions_from_level_idTolevels.name_fr,
      fromChoiceId: t.from_choice_id,
      fromChoiceName: t.level_choices_education_transitions_from_choice_idTolevel_choices?.name_fr,
      toLevelId: t.to_level_id,
      toLevelName: t.levels_education_transitions_to_level_idTolevels.name_fr,
      toChoiceId: t.to_choice_id,
      toChoiceName: t.level_choices_education_transitions_to_choice_idTolevel_choices?.name_fr,
      isActive: t.is_active,
      notes: t.notes,
    }));

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { fromLevelId, fromChoiceId, toLevelId, toChoiceId, notes } = body;

    const created = await prisma.education_transitions.create({
      data: {
        from_level_id: fromLevelId,
        from_choice_id: fromChoiceId || null,
        to_level_id: toLevelId,
        to_choice_id: toChoiceId || null,
        notes: notes || null,
        is_active: true,
      },
    });

    return NextResponse.json({ success: true, data: created });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
