import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { validateAdminSession, unauthorizedResponse } from '@/lib/session';

export async function GET(req: NextRequest) {
  const user = await validateAdminSession(req);
  if (!user) return unauthorizedResponse();

  try {
    const settings = await prisma.system_settings.findMany();
    const map: Record<string, any> = {};
    for (const s of settings) {
      map[s.key] = typeof s.value_json === 'object' && s.value_json !== null && 'value' in (s.value_json as any)
        ? (s.value_json as any).value
        : s.value_json;
    }

    return NextResponse.json({ success: true, data: map });
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

    for (const [key, val] of Object.entries(body)) {
      const jsonVal = JSON.parse(JSON.stringify({ value: val }));
      const existing = await prisma.system_settings.findFirst({ where: { key } });
      if (existing) {
        await prisma.system_settings.update({
          where: { id: existing.id },
          data: {
            value_json: jsonVal,
            updated_at: new Date(),
          },
        });
      } else {
        await prisma.system_settings.create({
          data: {
            key,
            value_json: jsonVal,
            is_public: key.startsWith('branding:'),
          },
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Paramètres mis à jour.' });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: err.message } },
      { status: 500 }
    );
  }
}
