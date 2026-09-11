import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAdminSession, unauthorizedResponse } from '@/lib/session';

export async function GET(req: NextRequest) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  try {
    const schools = await prisma.schools.findMany({
      orderBy: { name: 'asc' },
    });

    const data = schools.map((s) => ({
      id: s.id,
      name: s.name,
      shortName: s.short_name,
      code: s.code,
      description: s.description,
      phonePrimary: s.phone_primary,
      phoneSecondary: s.phone_secondary,
      whatsapp: s.whatsapp,
      emailPrimary: s.email_primary,
      address: s.address,
      wilaya: s.wilaya,
      commune: s.commune,
      postalCode: s.postal_code,
      latitude: s.latitude,
      longitude: s.longitude,
      googleMapsUrl: s.google_maps_url,
      status: s.status,
      isActive: s.is_active,
      openingHoursJson: s.opening_hours_json,
      socialLinksJson: s.social_links_json,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    }));

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
