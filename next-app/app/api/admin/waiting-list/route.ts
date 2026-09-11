import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAdminSession, unauthorizedResponse } from '@/lib/session';

export async function GET(req: NextRequest) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  try {
    const entries = await prisma.waiting_list_entries.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        registrations: {
          include: {
            students: true,
            parents: true,
            schools: true,
            levels: true,
          },
        },
        school_year_levels: {
          include: {
            schools: true,
            levels: true,
          },
        },
      },
      orderBy: { entered_at: 'asc' },
    });

    const data = entries.map((entry) => {
      const reg = entry.registrations;
      const student = reg?.students;
      const parent = reg?.parents;
      const school = reg?.schools || entry.school_year_levels?.schools;
      const level = reg?.levels || entry.school_year_levels?.levels;

      return {
        id: reg?.id || entry.id,
        entryId: entry.id,
        code: reg?.registration_code || 'WAIT-' + entry.id.substring(0, 6),
        status: reg?.status || 'WAITLISTED',
        submittedAt: reg?.submitted_at || entry.entered_at,
        createdAt: reg?.created_at || entry.created_at,
        student: {
          id: student?.id,
          fullName: student?.full_name || (student ? `${student.first_name || ''} ${student.last_name || ''}`.trim() : 'Élève'),
          firstName: student?.first_name || '',
          lastName: student?.last_name || '',
          birthDate: student?.birth_date,
        },
        primaryParent: {
          id: parent?.id,
          fullName: parent?.full_name || 'Parent',
          phonePrimary: parent?.phone_primary,
          email: parent?.email,
        },
        school: {
          id: school?.id,
          name: school?.name || 'Campus',
        },
        level: {
          id: level?.id,
          name: level?.name_fr || 'Niveau',
        },
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
