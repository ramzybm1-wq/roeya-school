import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const docTypes = await prisma.document_types.findMany({
      where: { is_active: true },
      orderBy: { created_at: 'asc' },
    });

    const publicReqs = docTypes.map((d, index) => ({
      documentTypeId: d.id,
      nameFr: d.name_fr,
      nameAr: d.name_ar,
      descriptionFr: d.description_fr,
      descriptionAr: d.description_ar,
      fileRuleType: d.file_rule_type,
      maxFileSizeBytes: d.max_file_size_bytes || 5242880,
      maxFiles: d.max_files || 1,
      isRequired: true,
      blockSubmissionIfMissing: false,
      displayOrder: index + 1,
    }));

    return NextResponse.json({ success: true, data: publicReqs });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
