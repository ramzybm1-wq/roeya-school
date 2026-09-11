import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAdminSession, unauthorizedResponse } from '@/lib/session';

export async function GET(req: NextRequest) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  try {
    const types = await prisma.document_types.findMany({
      where: { is_active: true },
      orderBy: { name_fr: 'asc' },
    });

    const data = types.map((t) => ({
      id: t.id,
      code: t.name_fr.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
      name: t.name_fr,
      nameFr: t.name_fr,
      nameAr: t.name_ar,
      descriptionFr: t.description_fr,
      descriptionAr: t.description_ar,
      fileRuleType: t.file_rule_type,
      maxFileSizeBytes: t.max_file_size_bytes,
      maxFiles: t.max_files,
      isActive: t.is_active,
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
    const { nameFr, nameAr, descriptionFr, descriptionAr, fileRuleType = 'IMAGE_OR_PDF', maxFileSizeBytes = 5242880 } = body;

    if (!nameFr) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Nom français requis.' } },
        { status: 400 }
      );
    }

    const created = await prisma.document_types.create({
      data: {
        name_fr: nameFr,
        name_ar: nameAr || null,
        description_fr: descriptionFr || null,
        description_ar: descriptionAr || null,
        file_rule_type: fileRuleType,
        max_file_size_bytes: maxFileSizeBytes,
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
