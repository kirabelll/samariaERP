import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const penalty = await prisma.cementPenalty.findUnique({
      where: { id },
    });

    if (!penalty) {
      return NextResponse.json(
        { success: false, error: 'Penalty not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: penalty,
    });
  } catch (error: any) {
    console.error('Error fetching cement penalty:', error);
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

    // Strip id and createdAt from update
    const { id: _, createdAt: __, ...updateData } = body;

    const penalty = await prisma.cementPenalty.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: penalty,
    });
  } catch (error: any) {
    console.error('Error updating cement penalty:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PATCH — update recovery status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { recoveryStatus, recoveredAmount, notes } = body;

    const penalty = await prisma.cementPenalty.findUnique({ where: { id } });
    if (!penalty) {
      return NextResponse.json({ success: false, error: 'Penalty not found' }, { status: 404 });
    }

    const validStatuses = ['Pending', 'Deducted', 'Recovered', 'Waived'];
    if (recoveryStatus && !validStatuses.includes(recoveryStatus)) {
      return NextResponse.json({ success: false, error: `Invalid recovery status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    const updateData: any = {};
    if (recoveryStatus) updateData.recoveryStatus = recoveryStatus;
    if (recoveredAmount !== undefined) updateData.recoveredAmount = parseFloat(recoveredAmount);
    if (notes !== undefined) updateData.notes = notes;

    // If marking as Recovered or Deducted and no recoveredAmount provided, default to penaltyAmount
    if ((recoveryStatus === 'Recovered' || recoveryStatus === 'Deducted') && recoveredAmount === undefined) {
      updateData.recoveredAmount = penalty.penaltyAmount;
    }
    // If waived, set recoveredAmount to 0
    if (recoveryStatus === 'Waived') {
      updateData.recoveredAmount = 0;
    }

    const updated = await prisma.cementPenalty.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Recovery status updated to ${recoveryStatus}`,
    });
  } catch (error: any) {
    console.error('[Penalty PATCH] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.cementPenalty.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      data: { id },
    });
  } catch (error: any) {
    console.error('Error deleting cement penalty:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
