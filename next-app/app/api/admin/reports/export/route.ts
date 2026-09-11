import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAdminSession, unauthorizedResponse } from '@/lib/session';

export async function GET(req: NextRequest) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  try {
    const { searchParams } = new URL(req.url);
    const format = (searchParams.get('format') || 'CSV').toUpperCase();
    const type = (searchParams.get('type') || 'REGISTRATIONS_GLOBAL').toUpperCase();
    const schoolId = searchParams.get('schoolId');

    const where: any = {};
    if (schoolId) where.school_id = schoolId;
    if (type === 'WAITLIST') where.status = 'WAITLISTED';
    if (type === 'ACCEPTED') where.status = 'ACCEPTED';

    const registrations = await prisma.registrations.findMany({
      where,
      include: {
        students: true,
        parents: true,
        schools: true,
        levels: true,
      },
      orderBy: { created_at: 'desc' },
    });

    const headers = ['Code Dossier', 'Statut', 'Élève Nom', 'Élève Prénom', 'Date Naissance', 'Parent', 'Téléphone', 'Établissement', 'Niveau', 'Date Démission'];
    const rows = registrations.map((r) => [
      r.registration_code,
      r.status,
      r.students?.last_name || '',
      r.students?.first_name || '',
      r.students?.birth_date ? new Date(r.students.birth_date).toISOString().split('T')[0] : '',
      r.parents?.full_name || '',
      r.parents?.phone_primary || '',
      r.schools?.name || '',
      r.levels?.name_fr || '',
      r.submitted_at ? new Date(r.submitted_at).toISOString().split('T')[0] : new Date(r.created_at).toISOString().split('T')[0],
    ]);

    // CSV generator with CSV injection escaping
    const escapeCsv = (val: any) => {
      let str = String(val ?? '');
      if (/^[=+\-@]/.test(str)) str = "'" + str;
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        str = `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = '\uFEFF' + [headers.map(escapeCsv).join(';'), ...rows.map((row) => row.map(escapeCsv).join(';'))].join('\r\n');

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="rapport_${type.toLowerCase()}_${Date.now()}.csv"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
