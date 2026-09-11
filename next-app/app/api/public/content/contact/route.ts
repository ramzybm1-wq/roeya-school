import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const fullName = (body.fullName || body.name || '').trim();
    const email = (body.email || '').trim();
    const phone = (body.phone || '').trim();
    const subject = (body.subject || 'Message depuis le site web').trim();
    const message = (body.message || '').trim();
    const schoolId = body.schoolId || null;

    if (!fullName || (!email && !phone) || !message) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Nom, coordonnées et message requis.' } },
        { status: 400 }
      );
    }

    const created = await prisma.contact_messages.create({
      data: {
        full_name: fullName,
        email: email || null,
        phone: phone || null,
        subject,
        message,
        school_id: schoolId,
        status: 'NEW',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: created.id,
        message: 'Votre message a été transmis avec succès. Nous vous répondrons dans les plus brefs délais.',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
