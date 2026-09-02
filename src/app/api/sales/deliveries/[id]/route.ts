import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { restoreInventory } from '@/lib/inventory';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const record = await prisma.delivery.findUnique({
      where: { id: params.id },
      include: {
        customer: {
          select: {
            companyName: true,
          },
        },
      },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: record });
  } catch (error: any) {
    console.error('Error fetching record:', error);
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
    const body = await request.json();

    // Strip non-updatable and relation fields
    const { id: _id, customer: _customer, salesOrder: _salesOrder, ...updateData } = body;

    const record = await prisma.delivery.findUnique({
      where: { id: params.id },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    const updatedRecord = await prisma.delivery.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: updatedRecord });
  } catch (error: any) {
    console.error('Error updating record:', error);
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
    const record = await prisma.delivery.findUnique({
      where: { id: params.id },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    // Only restore inventory if this was a standalone delivery not linked to a sales order
    // (since a sales order maintains the stock deduction while active)
    if (!record.salesOrderId && record.status !== 'Inactive' && record.status !== 'Cancelled') {
      try {
        await restoreInventory(record.items, record.division, { orderNo: record.deliveryNo });
      } catch (e) {
        console.error('Error restoring stock on delivery delete:', e);
      }
    }

    // Permanently delete delivery record
    const deletedRecord = await prisma.delivery.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Record permanently deleted successfully',
      data: deletedRecord,
    });
  } catch (error: any) {
    console.error('Error deleting record:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
