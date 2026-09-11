import { NextResponse } from 'next/server';
import { getCachedBranding } from '@/lib/view-renderer';
import prisma from '@/lib/prisma';
import { cached } from '@/lib/cache';

export async function GET() {
  try {
    const settingsObj = await cached(
      'public:branding',
      async () => {
        const branding = await getCachedBranding();

        const result: Record<string, unknown> = {
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

        const rows = await prisma.system_settings.findMany({
          where: { is_public: true },
        });

        for (const r of rows) {
          if (r.value_json) {
            const val = typeof r.value_json === 'object' ? (r.value_json as Record<string, unknown>).value : r.value_json;
            result[r.key] = val;
          }
        }

        return result;
      },
      { ttl: 60, tags: ['branding', 'settings'] }
    );

    return NextResponse.json({ success: true, data: settingsObj });
  } catch (err: unknown) {
    console.error('[API] GET /api/public/branding error:', err);
    return NextResponse.json(
      { success: false, error: { code: 'SETTINGS_ERROR', message: 'Une erreur interne est survenue.' } },
      { status: 500 }
    );
  }
}
