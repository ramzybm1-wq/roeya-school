import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAdminSession, unauthorizedResponse } from '@/lib/session';

export async function GET(req: NextRequest) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  try {
    const query = `
      SELECT 
        rd.id,
        rd.registration_id as "registrationId",
        rd.original_filename as "originalName",
        rd.mime_type as "mimeType",
        rd.status as "status",
        rd.created_at as "createdAt",
        r.code as "registrationCode",
        dt.name_fr as "type"
      FROM registration_documents rd
      LEFT JOIN registrations r ON rd.registration_id = r.id
      LEFT JOIN document_types dt ON rd.document_type_id = dt.id
      ORDER BY rd.created_at DESC
      LIMIT 100;
    `;

    const rawDocs = await prisma.$queryRawUnsafe<any[]>(query).catch(() => []);

    return NextResponse.json({
      success: true,
      data: rawDocs.map((d) => ({
        id: d.id,
        registrationId: d.registrationId,
        originalName: d.originalName,
        name: d.originalName,
        mimeType: d.mimeType || 'application/pdf',
        status: d.status || 'VALIDATED',
        registrationCode: d.registrationCode || '—',
        type: d.type || 'Justificatif',
        createdAt: d.createdAt,
      })),
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
