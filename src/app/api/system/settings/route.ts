import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET all system settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 });
    }

    const settings = await prisma.systemSetting.findMany();
    const settingsMap: Record<string, string> = {};
    for (const s of settings) {
      // Mask sensitive values
      if (s.key.includes('token') || s.key.includes('secret')) {
        settingsMap[s.key] = s.value ? `${s.value.slice(0, 8)}...` : '';
      } else {
        settingsMap[s.key] = s.value;
      }
    }

    return NextResponse.json({ success: true, data: settingsMap });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to fetch settings' }, { status: 500 });
  }
}

// PUT update a system setting
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { key, value } = body;

    if (!key) {
      return NextResponse.json({ success: false, error: 'Key is required' }, { status: 400 });
    }

    const setting = await prisma.systemSetting.upsert({
      where: { key },
      update: { value: value || '' },
      create: { key, value: value || '' },
    });

    return NextResponse.json({ success: true, data: setting });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Failed to update setting' }, { status: 500 });
  }
}
