import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cached } from '@/lib/cache';

export async function GET() {
  try {
    const publicSchools = await cached(
      'public:schools',
      async () => {
        const schools = await prisma.schools.findMany({
          where: { is_active: true },
          orderBy: { name: 'asc' },
        });

        return schools.map((s) => ({
          id: s.id,
          name: s.name,
          shortName: s.short_name,
          code: s.code,
          description: s.description,
          phonePrimary: s.is_phone_public ? s.phone_primary : null,
          phoneSecondary: s.is_phone_public ? s.phone_secondary : null,
          whatsapp: s.is_whatsapp_public ? s.whatsapp : null,
          emailPrimary: s.is_email_public ? s.email_primary : null,
          website: s.website,
          address: s.address,
          wilaya: s.wilaya,
          commune: s.commune,
          postalCode: s.postal_code,
          country: s.country,
          latitude: s.is_map_public ? s.latitude : null,
          longitude: s.is_map_public ? s.longitude : null,
          googleMapsUrl: s.is_map_public ? s.google_maps_url : null,
          openingHoursJson: s.opening_hours_json,
          socialLinksJson: s.social_links_json,
          isPhonePublic: s.is_phone_public,
          isEmailPublic: s.is_email_public,
          isWhatsappPublic: s.is_whatsapp_public,
          isMapPublic: s.is_map_public,
          status: s.status,
        }));
      },
      { ttl: 60, tags: ['schools'] }
    );

    return NextResponse.json({ success: true, data: publicSchools });
  } catch (err: unknown) {
    console.error('[API] GET /api/public/schools error:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Une erreur interne est survenue.' } },
      { status: 500 }
    );
  }
}
