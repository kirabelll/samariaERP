import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const record = await prisma.pettyCash.findUnique({
      where: { id: params.id },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Petty cash record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: record,
    });
  } catch (error: any) {
    console.error('Error fetching petty cash record:', error);
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
    const record = await prisma.pettyCash.findUnique({
      where: { id: params.id },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Petty cash record not found' },
        { status: 404 }
      );
    }

    // Cannot edit cancelled or posted records
    if (record.status === 'Cancelled') {
      return NextResponse.json(
        { success: false, error: 'Cannot edit a cancelled record' },
        { status: 400 }
      );
    }

    if (record.status === 'Posted') {
      return NextResponse.json(
        { success: false, error: 'Cannot edit a posted record' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { id, createdAt, updatedAt, ...updateData } = body;

    const updatedRecord = await prisma.pettyCash.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: updatedRecord,
    });
  } catch (error: any) {
    console.error('Error updating petty cash record:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const record = await prisma.pettyCash.findUnique({
      where: { id: params.id },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Petty cash record not found' },
        { status: 404 }
      );
    }

    if (record.status === 'Posted') {
      return NextResponse.json(
        { success: false, error: 'Cannot cancel a posted record' },
        { status: 400 }
      );
    }

    // Soft delete - set status to Cancelled
    const cancelledRecord = await prisma.pettyCash.update({
      where: { id: params.id },
      data: { status: 'Cancelled' },
    });

    return NextResponse.json({
      success: true,
      data: cancelledRecord,
    });
  } catch (error: any) {
    console.error('Error cancelling petty cash record:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
