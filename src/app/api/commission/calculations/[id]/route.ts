import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const calculation = await prisma.commissionCalculation.findUnique({
      where: { id },
      include: {
        items: true,
      },
    });

    if (!calculation) {
      return NextResponse.json(
        { success: false, error: 'Commission calculation not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: calculation,
    });
  } catch (error: any) {
    console.error('Error fetching commission calculation:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const calculation = await prisma.commissionCalculation.update({
      where: { id },
      data: body,
      include: {
        items: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: calculation,
    });
  } catch (error: any) {
    console.error('Error updating commission calculation:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Delete related commission items first
    await prisma.commissionItem.deleteMany({
      where: { calculationId: id },
    });

    // Delete the calculation
    await prisma.commissionCalculation.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      data: { id },
    });
  } catch (error: any) {
    console.error('Error deleting commission calculation:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
