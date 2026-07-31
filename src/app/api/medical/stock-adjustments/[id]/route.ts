import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const adjustment = await prisma.stockAdjustment.findUnique({
      where: { id },
    });

    if (!adjustment) {
      return NextResponse.json(
        { success: false, error: 'Stock adjustment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: adjustment,
    });
  } catch (error: any) {
    console.error('Error fetching stock adjustment:', error);
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

    const adjustment = await prisma.stockAdjustment.update({
      where: { id },
      data: body,
    });

    return NextResponse.json({
      success: true,
      data: adjustment,
    });
  } catch (error: any) {
    console.error('Error updating stock adjustment:', error);
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

    await prisma.stockAdjustment.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      data: { id },
    });
  } catch (error: any) {
    console.error('Error deleting stock adjustment:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
