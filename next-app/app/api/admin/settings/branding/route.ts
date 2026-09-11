import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAdminSession, unauthorizedResponse } from '@/lib/session';

export async function GET(req: NextRequest) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  try {
    const settings = await prisma.system_settings.findMany({
      where: {
        key: {
          in: ['branding:platform_name', 'branding:site_name', 'branding:client_logo_url', 'branding:admin_logo_url', 'branding:favicon_url'],
        },
      },
    });

    const map: Record<string, any> = {};
    for (const s of settings) {
      map[s.key] = typeof s.value_json === 'object' && s.value_json !== null && 'value' in (s.value_json as any)
        ? (s.value_json as any).value
        : s.value_json;
    }

    return NextResponse.json({
      success: true,
      data: {
        platformName: map['branding:platform_name'] || map['branding:site_name'] || 'ROEYA SCHOOL',
        siteName: map['branding:site_name'] || map['branding:platform_name'] || 'ROEYA SCHOOL',
        clientLogoUrl: map['branding:client_logo_url'] || null,
        adminLogoUrl: map['branding:admin_logo_url'] || null,
        faviconUrl: map['branding:favicon_url'] || null,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  try {
    const body = await req.json();
    const { platformName, siteName, clientLogoUrl, adminLogoUrl, faviconUrl } = body;

    const updates: [string, any][] = [
      ['branding:platform_name', platformName || siteName],
      ['branding:site_name', siteName || platformName],
      ['branding:client_logo_url', clientLogoUrl],
      ['branding:admin_logo_url', adminLogoUrl],
      ['branding:favicon_url', faviconUrl],
    ];

    for (const [key, val] of updates) {
      if (val !== undefined) {
        const existing = await prisma.system_settings.findFirst({ where: { key } });
        if (existing) {
          await prisma.system_settings.update({
            where: { id: existing.id },
            data: {
              value_json: { value: val },
              updated_at: new Date(),
            },
          });
        } else {
          await prisma.system_settings.create({
            data: {
              key,
              value_json: { value: val },
              is_public: true,
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Branding mis à jour avec succès.' });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
