import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        role: true,
        permissions: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        role: user.role,
        permissions: user.permissions,
      },
    });
  } catch (error: any) {
    console.error('Error fetching user permissions:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { allowedPages } = body as { allowedPages: string[] };

    if (!Array.isArray(allowedPages)) {
      return NextResponse.json(
        { success: false, error: 'allowedPages must be an array of strings' },
        { status: 400 }
      );
    }

    // Delete all existing permissions for this user
    await prisma.userPermission.deleteMany({
      where: { userId: params.id },
    });

    // Create new permission records — one row per page with canView=true
    if (allowedPages.length > 0) {
      await prisma.userPermission.createMany({
        data: allowedPages.map((page) => ({
          userId: params.id,
          module: page,
          canView: true,
        })),
      });
    }

    // Fetch and return the updated permissions
    const updatedPermissions = await prisma.userPermission.findMany({
      where: { userId: params.id },
    });

    return NextResponse.json({
      success: true,
      data: updatedPermissions,
    });
  } catch (error: any) {
    console.error('Error updating user permissions:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
