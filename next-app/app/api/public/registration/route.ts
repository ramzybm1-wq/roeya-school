import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Données d’inscription manquantes.' } },
        { status: 400 }
      );
    }

    let schoolId = body.schoolId || body.school_id;
    let levelId = body.levelId || body.level_id;
    let choiceId = body.choiceId || body.choice_id || null;
    let academicYearId = body.academicYearId || body.academic_year_id;

    // Resolve active academic year if not provided
    if (!academicYearId) {
      const activeYear = await prisma.academic_years.findFirst({
        where: { is_active_default: true },
      });
      if (activeYear) {
        academicYearId = activeYear.id;
      } else {
        const anyYear = await prisma.academic_years.findFirst();
        if (anyYear) academicYearId = anyYear.id;
      }
    }

    if (!schoolId || !levelId || !academicYearId) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Veuillez sélectionner un établissement et un niveau scolaire.' } },
        { status: 400 }
      );
    }

    // Resolve or provision school_year_level
    let syl = await prisma.school_year_levels.findFirst({
      where: {
        school_id: schoolId,
        level_id: levelId,
        academic_year_id: academicYearId,
      },
    });

    if (!syl) {
      syl = await prisma.school_year_levels.create({
        data: {
          school_id: schoolId,
          level_id: levelId,
          academic_year_id: academicYearId,
          capacity_mode: 'LIMITED',
          capacity_max: 255,
          registration_open: true,
          full_behavior: 'WAITLIST',
        },
      });
    }

    // Generate unique code: REG-YYYY-XXXXXX
    const count = await prisma.registrations.count();
    const currentYear = new Date().getFullYear();
    const seq = String(count + 1).padStart(6, '0');
    const registrationCode = `REG-${currentYear}-${seq}`;

    // Extract student & parent details
    const studentData = body.student || {};
    const parentData = body.primaryParent || body.parent || {};

    const studentFullName = studentData.fullName || `${studentData.firstNameFr || studentData.firstName || ''} ${studentData.lastNameFr || studentData.lastName || ''}`.trim() || 'Élève';
    const parentFullName = parentData.fullName || `${parentData.firstNameFr || parentData.firstName || ''} ${parentData.lastNameFr || parentData.lastName || ''}`.trim() || 'Parent / Tuteur';

    const now = new Date();

    // Create parent record
    const createdParent = await prisma.parents.create({
      data: {
        full_name: parentFullName,
        phone_primary: parentData.phonePrimary || parentData.phone || '0550000000',
        phone_secondary: parentData.phoneSecondary || null,
        whatsapp: parentData.whatsapp || null,
        email: parentData.email || null,
        address: parentData.address || null,
        wilaya: parentData.wilaya || 'Alger',
        commune: parentData.commune || null,
      },
    });

    // Create student record
    const createdStudent = await prisma.students.create({
      data: {
        full_name: studentFullName,
        first_name: studentData.firstNameFr || studentData.firstName || null,
        last_name: studentData.lastNameFr || studentData.lastName || null,
        gender: studentData.gender === 'FEMALE' ? 'FEMALE' : 'MALE',
        birth_date: studentData.birthDate ? new Date(studentData.birthDate) : new Date('2018-01-01'),
        birth_place: studentData.birthPlace || null,
        current_school: studentData.currentSchool || null,
        wilaya: studentData.wilaya || 'Alger',
        commune: studentData.commune || null,
      },
    });

    // Create registration record
    const createdReg = await prisma.registrations.create({
      data: {
        registration_code: registrationCode,
        school_id: schoolId,
        academic_year_id: academicYearId,
        level_id: levelId,
        choice_id: choiceId,
        school_year_level_id: syl.id,
        parent_id: createdParent.id,
        student_id: createdStudent.id,
        status: 'NEW',
        source: 'PUBLIC_WEB',
        submitted_at: now,
      },
    });

    // Create status history
    await prisma.registration_status_history.create({
      data: {
        registration_id: createdReg.id,
        from_status: null,
        to_status: 'NEW',
        public_comment: 'Dossier d’inscription soumis avec succès.',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: createdReg.id,
        registrationId: createdReg.id,
        code: registrationCode,
        registrationCode,
        status: 'NEW',
        trackingToken: registrationCode,
      },
    });
  } catch (err: any) {
    console.error('[API] POST /api/public/registration error:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
