import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAdminSession, unauthorizedResponse } from '@/lib/session';

// GET /api/admin/registrations — list registrations with filtering
export async function GET(req: NextRequest) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  try {
    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const search = url.searchParams.get('search') || '';

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { students: { first_name: { contains: search, mode: 'insensitive' } } },
        { students: { last_name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [registrations, total] = await Promise.all([
      prisma.registrations.findMany({
        where,
        include: {
          students: true,
          parents: true,
          schools: true,
          levels: true,
          academic_years: true,
        },
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.registrations.count({ where }),
    ]);

    const data = registrations.map((r) => ({
      id: r.id,
      code: r.registration_code,
      status: r.status,
      source: r.source,
      schoolId: r.school_id,
      schoolName: r.schools?.name || null,
      levelId: r.level_id,
      levelName: r.levels?.name_fr || null,
      academicYearId: r.academic_year_id,
      academicYearName: r.academic_years?.name || null,
      student: r.students ? {
        id: r.students.id,
        firstName: r.students.first_name,
        lastName: r.students.last_name,
        gender: r.students.gender,
        dateOfBirth: r.students.birth_date,
      } : null,
      parent: r.parents ? {
        id: r.parents.id,
        firstName: r.parents.full_name,
        lastName: '',
        phone: r.parents.phone_primary,
        email: r.parents.email,
      } : null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    return NextResponse.json({
      success: true,
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (err: any) {
    console.error('[API] GET /api/admin/registrations error:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
