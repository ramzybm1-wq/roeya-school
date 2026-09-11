import { NextResponse } from 'next/server';
import { getCachedBranding } from '@/lib/view-renderer';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const branding = await getCachedBranding();
    
    // Also fetch full settings if present in system_settings
    const rows = await prisma.system_settings.findMany({
      where: { is_public: true },
    });

    const settingsObj: Record<string, any> = {
      siteName: branding.siteName,
      platformName: branding.siteName,
      shortName: branding.siteName,
      brandShortName: branding.siteName,
      tagline: 'Excellence & Épanouissement',
      clientLogoUrl: branding.clientLogoUrl,
      adminLogoUrl: branding.adminLogoUrl,
      faviconUrl: branding.faviconUrl,
      defaultAcademicYear: '2026 / 2027',
      currency: 'DZD',
      allowPublicRegistration: true,
      contactEmail: 'contact@visionschool.dz',
      contactPhone: '+213 (0) 23 45 67 89',
      contactAddress: 'Hydra, Alger, Algérie',
      updatedAt: branding.updatedAt,
    };

    for (const r of rows) {
      if (r.value_json) {
        const val = typeof r.value_json === 'object' ? (r.value_json as any).value : r.value_json;
        settingsObj[r.key] = val;
      }
    }

    return NextResponse.json({
      success: true,
      data: settingsObj,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'SETTINGS_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
