import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAdminSession, unauthorizedResponse } from '@/lib/session';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  try {
    const school = await prisma.schools.findUnique({ where: { id } });
    if (!school) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Établissement introuvable.' } }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: school });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  try {
    const body = await req.json();
    const existing = await prisma.schools.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Établissement introuvable.' } }, { status: 404 });
    }

    if (body.code && body.code.trim().toUpperCase() !== existing.code) {
      const dup = await prisma.schools.findUnique({ where: { code: body.code.trim().toUpperCase() } });
      if (dup) {
        return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: `Le code ${body.code.trim().toUpperCase()} est déjà utilisé.` } }, { status: 400 });
      }
    }

    const updated = await prisma.schools.update({
      where: { id },
      data: {
        name: body.name !== undefined ? body.name.trim() : undefined,
        short_name: body.shortName !== undefined ? body.shortName?.trim() || null : undefined,
        code: body.code !== undefined ? body.code.trim().toUpperCase() : undefined,
        description: body.description !== undefined ? body.description : undefined,
        phone_primary: body.phonePrimary !== undefined ? body.phonePrimary : undefined,
        phone_secondary: body.phoneSecondary !== undefined ? body.phoneSecondary : undefined,
        whatsapp: body.whatsapp !== undefined ? body.whatsapp : undefined,
        email_primary: body.emailPrimary !== undefined ? body.emailPrimary : undefined,
        email_secondary: body.emailSecondary !== undefined ? body.emailSecondary : undefined,
        website: body.website !== undefined ? body.website : undefined,
        address: body.address !== undefined ? body.address : undefined,
        wilaya: body.wilaya !== undefined ? body.wilaya : undefined,
        commune: body.commune !== undefined ? body.commune : undefined,
        postal_code: body.postalCode !== undefined ? body.postalCode : undefined,
        country: body.country !== undefined ? body.country : undefined,
        latitude: body.latitude !== undefined ? body.latitude : undefined,
        longitude: body.longitude !== undefined ? body.longitude : undefined,
        google_maps_url: body.googleMapsUrl !== undefined ? body.googleMapsUrl : undefined,
        status: body.status !== undefined ? body.status : undefined,
        is_active: body.isActive !== undefined ? body.isActive : undefined,
        opening_hours_json: body.openingHoursJson !== undefined ? body.openingHoursJson : undefined,
        social_links_json: body.socialLinksJson !== undefined ? body.socialLinksJson : undefined,
        updated_at: new Date(),
      },
    });

    await prisma.audit_logs.create({
      data: {
        user_id: user.id,
        action: 'SCHOOL_UPDATED',
        module: 'SCHOOLS',
        entity_type: 'SCHOOL',
        entity_id: id,
        school_id: id,
        result: 'SUCCESS',
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  const permanent = req.nextUrl.searchParams.get('permanent') === 'true';

  try {
    const existing = await prisma.schools.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: { code: 'NOT_FOUND', message: 'Établissement introuvable.' } }, { status: 404 });
    }

    if (permanent) {
      if (user.role !== 'SUPER_ADMIN' && !user.permissions.includes('school.delete')) {
        return NextResponse.json({ success: false, error: { code: 'FORBIDDEN', message: 'Seul le Super Administrateur peut supprimer définitivement.' } }, { status: 403 });
      }

      const regCount = await prisma.registrations.count({ where: { school_id: id } });
      if (regCount > 0) {
        return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: `Suppression impossible : ${regCount} inscription(s) existante(s).` } }, { status: 400 });
      }

      // Cleanup configuration data
      await prisma.school_year_levels.deleteMany({ where: { school_id: id } });
      await prisma.user_school_access.deleteMany({ where: { school_id: id } });
      await prisma.system_settings.deleteMany({ where: { school_id: id } });
      await prisma.audit_logs.updateMany({ where: { school_id: id }, data: { school_id: null } });

      await prisma.audit_logs.create({
        data: {
          user_id: user.id, action: 'SCHOOL_PERMANENTLY_DELETED', module: 'SCHOOLS',
          entity_type: 'SCHOOL', entity_id: id, result: 'SUCCESS',
          before_json: { id: existing.id, name: existing.name, code: existing.code },
        },
      });

      await prisma.schools.delete({ where: { id } });
      return NextResponse.json({ success: true, data: { id, deleted: true, message: `Établissement "${existing.name}" supprimé définitivement.` } });
    }

    // Archive
    const updated = await prisma.schools.update({
      where: { id },
      data: { is_active: false, status: 'ARCHIVED', archived_at: new Date(), updated_at: new Date() },
    });
    return NextResponse.json({ success: true, data: { id, archived: true, school: updated } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } }, { status: 500 });
  }
}
