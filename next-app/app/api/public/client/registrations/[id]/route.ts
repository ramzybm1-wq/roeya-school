import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateClientSession, unauthorizedResponse } from '@/lib/session';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await validateClientSession(req);
  if (!user) return unauthorizedResponse();

  const { id } = await params;

  try {
    const reg = await prisma.registrations.findUnique({
      where: { id },
      include: {
        students: true,
        parents: true,
        schools: true,
        levels: { include: { cycles: true } },
        level_choices: true,
        academic_years: true,
        registration_status_history: {
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!reg) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Dossier d’inscription introuvable.' } },
        { status: 404 }
      );
    }

    // Check ownership
    const cleanUserPhone = (user.phone || '').replace(/\D/g, '');
    const cleanParentPhone = (reg.parents?.phone_primary || '').replace(/\D/g, '');
    const isOwner =
      reg.parents?.email?.toLowerCase() === user.email.toLowerCase() ||
      (cleanUserPhone && cleanParentPhone && (cleanUserPhone.endsWith(cleanParentPhone) || cleanParentPhone.endsWith(cleanUserPhone)));

    if (!isOwner) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Accès refusé : vous n’êtes pas autorisé à consulter ce dossier.' } },
        { status: 403 }
      );
    }

    const data = {
      id: reg.id,
      registrationCode: reg.registration_code,
      status: reg.status,
      submittedAt: reg.submitted_at,
      createdAt: reg.created_at,
      student: reg.students ? {
        id: reg.students.id,
        firstName: reg.students.first_name,
        lastName: reg.students.last_name,
        fullName: reg.students.full_name,
        dateOfBirth: reg.students.birth_date,
        gender: reg.students.gender,
      } : null,
      parent: reg.parents ? {
        id: reg.parents.id,
        fullName: reg.parents.full_name,
        phonePrimary: reg.parents.phone_primary,
        email: reg.parents.email,
        address: reg.parents.address,
      } : null,
      school: reg.schools ? {
        id: reg.schools.id,
        name: reg.schools.name,
      } : null,
      academicYear: reg.academic_years ? {
        id: reg.academic_years.id,
        name: reg.academic_years.name,
      } : null,
      level: reg.levels ? {
        id: reg.levels.id,
        nameFr: reg.levels.name_fr,
        code: reg.levels.code,
        cycleName: reg.levels.cycles?.name_fr || null,
      } : null,
      history: reg.registration_status_history.map((h) => ({
        status: h.to_status,
        date: h.created_at,
        comment: h.public_comment || '',
      })),
      documents: [],
    };

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
