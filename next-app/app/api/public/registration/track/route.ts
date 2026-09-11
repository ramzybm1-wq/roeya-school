import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code')?.trim();
    const phone = req.nextUrl.searchParams.get('phone')?.trim();

    if (!code || !phone) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Numéro de dossier et téléphone requis.' } },
        { status: 400 }
      );
    }

    const reg = await prisma.registrations.findFirst({
      where: {
        registration_code: code,
      },
      include: {
        schools: true,
        levels: true,
        level_choices: true,
        students: true,
        parents: true,
        academic_years: true,
        registration_status_history: {
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!reg) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Dossier introuvable.' } },
        { status: 404 }
      );
    }

    // Check phone match
    const cleanInputPhone = phone.replace(/\D/g, '');
    const cleanParentPhone = (reg.parents?.phone_primary || '').replace(/\D/g, '');
    const phoneMatches =
      cleanParentPhone.endsWith(cleanInputPhone) ||
      cleanInputPhone.endsWith(cleanParentPhone) ||
      reg.parents?.email?.toLowerCase() === phone.toLowerCase();

    if (!phoneMatches) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: 'Numéro de téléphone ou email non correspondant.' } },
        { status: 401 }
      );
    }

    const dossier = {
      id: reg.id,
      code: reg.registration_code,
      registrationCode: reg.registration_code,
      status: reg.status,
      submittedAt: reg.submitted_at,
      updatedAt: reg.updated_at,
      studentName: reg.students?.full_name || 'Élève',
      studentFirstName: reg.students?.first_name || '',
      studentLastName: reg.students?.last_name || '',
      parentName: reg.parents?.full_name || 'Parent',
      parentPhone: reg.parents?.phone_primary || '',
      schoolName: reg.schools?.name || '',
      levelName: reg.levels?.name_fr || '',
      choiceName: reg.level_choices?.name_fr || null,
      academicYear: reg.academic_years?.name || '',
      history: reg.registration_status_history.map((h) => ({
        status: h.to_status,
        date: h.created_at,
        comment: h.public_comment || '',
      })),
    };

    return NextResponse.json({ success: true, data: dossier });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
