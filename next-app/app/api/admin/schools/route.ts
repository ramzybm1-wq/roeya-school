import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAdminSession, unauthorizedResponse } from '@/lib/session';
import { invalidateCache } from '@/lib/cache';

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
  } catch (err: unknown) {
    console.error('[API] GET /api/admin/schools error:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Une erreur interne est survenue.' } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { name, code, shortName, phonePrimary, emailPrimary, wilaya, commune, address } = body;

    if (!name || !code) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'Le nom et le code sont obligatoires.' } },
        { status: 400 }
      );
    }

    const normalizedCode = code.trim().toUpperCase();
    const existing = await prisma.schools.findUnique({ where: { code: normalizedCode } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: { code: 'DUPLICATE_CODE', message: `Le code ${normalizedCode} est déjà utilisé.` } },
        { status: 400 }
      );
    }

    const school = await prisma.schools.create({
      data: {
        name: name.trim(),
        code: normalizedCode,
        short_name: shortName?.trim() || null,
        phone_primary: phonePrimary || null,
        email_primary: emailPrimary || null,
        wilaya: wilaya || null,
        commune: commune || null,
        address: address || null,
        is_active: body.isActive !== undefined ? body.isActive : true,
        status: body.status || 'ACTIVE',
      },
    });

    await prisma.audit_logs.create({
      data: {
        user_id: user.id,
        action: 'SCHOOL_CREATED',
        module: 'SCHOOLS',
        entity_type: 'SCHOOL',
        entity_id: school.id,
        school_id: school.id,
        result: 'SUCCESS',
      },
    });

    invalidateCache('schools');
    return NextResponse.json({ success: true, data: school }, { status: 201 });
  } catch (err: unknown) {
    console.error('[API] POST /api/admin/schools error:', err);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Une erreur interne est survenue.' } },
      { status: 500 }
    );
  }
}
