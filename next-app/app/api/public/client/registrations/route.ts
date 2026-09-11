import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateClientSession, unauthorizedResponse } from '@/lib/session';

export async function GET(req: NextRequest) {
  const user = await validateClientSession(req);
  if (!user) return unauthorizedResponse();

  try {
    // Find registrations matching parent email or phone
    const cleanPhone = (user.phone || '').replace(/\D/g, '');

    const rows = await prisma.registrations.findMany({
      where: {
        parents: {
          OR: [
            { email: { equals: user.email, mode: 'insensitive' } },
            ...(cleanPhone ? [{ phone_primary: { contains: cleanPhone } }] : []),
          ],
        },
      },
      include: {
        students: true,
        schools: true,
        levels: true,
        academic_years: true,
      },
      orderBy: { created_at: 'desc' },
    });

    const data = rows.map((r) => ({
      id: r.id,
      registrationCode: r.registration_code,
      status: r.status,
      submittedAt: r.submitted_at,
      createdAt: r.created_at,
      student: r.students ? {
        id: r.students.id,
        firstName: r.students.first_name,
        lastName: r.students.last_name,
        fullName: r.students.full_name,
        dateOfBirth: r.students.birth_date,
        gender: r.students.gender,
      } : null,
      school: r.schools ? {
        id: r.schools.id,
        name: r.schools.name,
      } : null,
      academicYear: r.academic_years ? {
        id: r.academic_years.id,
        name: r.academic_years.name,
      } : null,
      level: r.levels ? {
        id: r.levels.id,
        nameFr: r.levels.name_fr,
        code: r.levels.code,
      } : null,
    }));

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('[API] GET /api/public/client/registrations error:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
