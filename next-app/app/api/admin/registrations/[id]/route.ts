import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAdminSession, unauthorizedResponse } from '@/lib/session';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  const { id } = await params;

  try {
    const reg = await prisma.registrations.findUnique({
      where: { id },
      include: {
        schools: true,
        levels: { include: { cycles: true } },
        level_choices: true,
        academic_years: true,
        students: true,
        parents: true,
        registration_notes: {
          orderBy: { created_at: 'desc' },
          include: { users: true },
        },
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

    const data = {
      id: reg.id,
      code: reg.registration_code,
      registrationCode: reg.registration_code,
      status: reg.status,
      source: reg.source,
      submittedAt: reg.submitted_at,
      acceptedAt: reg.accepted_at,
      refusedAt: reg.refused_at,
      cancelledAt: reg.cancelled_at,
      waitlistedAt: reg.waitlisted_at,
      createdAt: reg.created_at,
      updatedAt: reg.updated_at,
      schoolId: reg.school_id,
      school: reg.schools ? {
        id: reg.schools.id,
        name: reg.schools.name,
        shortName: reg.schools.short_name,
        code: reg.schools.code,
      } : null,
      levelId: reg.level_id,
      level: reg.levels ? {
        id: reg.levels.id,
        nameFr: reg.levels.name_fr,
        code: reg.levels.code,
        cycleName: reg.levels.cycles?.name_fr || null,
      } : null,
      choice: reg.level_choices ? {
        id: reg.level_choices.id,
        nameFr: reg.level_choices.name_fr,
      } : null,
      academicYear: reg.academic_years ? {
        id: reg.academic_years.id,
        name: reg.academic_years.name,
      } : null,
      student: reg.students ? {
        id: reg.students.id,
        firstName: reg.students.first_name,
        lastName: reg.students.last_name,
        fullName: reg.students.full_name,
        gender: reg.students.gender,
        birthDate: reg.students.birth_date,
        birthPlace: reg.students.birth_place,
        currentSchool: reg.students.current_school,
        wilaya: reg.students.wilaya,
        commune: reg.students.commune,
      } : null,
      primaryParent: reg.parents ? {
        id: reg.parents.id,
        fullName: reg.parents.full_name,
        phonePrimary: reg.parents.phone_primary,
        phoneSecondary: reg.parents.phone_secondary,
        whatsapp: reg.parents.whatsapp,
        email: reg.parents.email,
        address: reg.parents.address,
        wilaya: reg.parents.wilaya,
        commune: reg.parents.commune,
      } : null,
      notes: reg.registration_notes.map((n) => ({
        id: n.id,
        content: n.content,
        createdAt: n.created_at,
        userName: n.users ? `${n.users.first_name} ${n.users.last_name}` : 'Système',
      })),
      history: reg.registration_status_history.map((h) => ({
        id: h.id,
        fromStatus: h.from_status,
        toStatus: h.to_status,
        reasonCode: h.reason_code,
        publicComment: h.public_comment,
        internalComment: h.internal_comment,
        createdAt: h.created_at,
      })),
    };

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error(`[API] GET /api/admin/registrations/${id} error:`, err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  const { id } = await params;

  try {
    const reg = await prisma.registrations.findUnique({ where: { id } });
    if (!reg) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: 'Dossier introuvable.' } },
        { status: 404 }
      );
    }

    const now = new Date();
    await prisma.registrations.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelled_at: now,
        updated_at: now,
      },
    });

    await prisma.registration_status_history.create({
      data: {
        registration_id: id,
        from_status: reg.status,
        to_status: 'CANCELLED',
        changed_by_user_id: user.id,
        internal_comment: 'Annulation administrative',
      },
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Dossier annulé avec succès.' },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
