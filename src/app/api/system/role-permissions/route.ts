import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: ['MAIN', 'MASTER DATA', 'CONSTRUCTION', 'MEDICAL', 'COMMERCIAL', 'PURCHASING', 'FINANCE', 'HR & PAYROLL', 'REPORTS', 'SYSTEM'],
  MANAGER: ['MAIN', 'MASTER DATA', 'CONSTRUCTION', 'MEDICAL', 'COMMERCIAL', 'PURCHASING', 'FINANCE', 'HR & PAYROLL', 'REPORTS', 'SYSTEM'],
  SALES: ['MAIN', 'MASTER DATA', 'COMMERCIAL', 'REPORTS'],
  PROCUREMENT: ['MAIN', 'MASTER DATA', 'PURCHASING', 'REPORTS'],
  FINANCE: ['MAIN', 'MASTER DATA', 'FINANCE', 'REPORTS'],
  HR: ['MAIN', 'MASTER DATA', 'HR & PAYROLL', 'REPORTS'],
  WAREHOUSE: ['MAIN', 'MASTER DATA', 'CONSTRUCTION'],
  MEDICAL_PHARMACIST: ['MAIN', 'MASTER DATA', 'MEDICAL'],
  MEDICAL_DRUGGIST: ['MAIN', 'MASTER DATA', 'MEDICAL'],
};

// GET - Load role permissions (any authenticated user can read)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const setting = await prisma.systemSetting.findUnique({
      where: { key: 'role_permissions' },
    });

    if (setting) {
      return NextResponse.json({
        success: true,
        data: JSON.parse(setting.value),
      });
    }

    // Return defaults if not yet saved
    return NextResponse.json({
      success: true,
      data: DEFAULT_ROLE_PERMISSIONS,
    });
  } catch (error: any) {
    console.error('Error loading role permissions:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Save role permissions (ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if ((session.user as any).role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const body = await request.json();
    const { permissions } = body;

    if (!permissions || typeof permissions !== 'object') {
      return NextResponse.json({ success: false, error: 'Invalid permissions data' }, { status: 400 });
    }

    // Ensure ADMIN and MANAGER always have full access
    permissions.ADMIN = DEFAULT_ROLE_PERMISSIONS.ADMIN;
    permissions.MANAGER = DEFAULT_ROLE_PERMISSIONS.MANAGER;

    await prisma.systemSetting.upsert({
      where: { key: 'role_permissions' },
      update: { value: JSON.stringify(permissions) },
      create: { key: 'role_permissions', value: JSON.stringify(permissions) },
    });

    return NextResponse.json({ success: true, message: 'Permissions saved' });
  } catch (error: any) {
    console.error('Error saving role permissions:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
