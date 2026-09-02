import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const record = await prisma.goodsReceive.findUnique({
      where: { id: params.id },
      include: {
        supplier: true,
        purchaseOrder: {
          include: { supplier: true },
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
    const { id: _id, supplier: _supplier, purchaseOrder: _purchaseOrder, ...updateData } = body;

    const record = await prisma.goodsReceive.findUnique({
      where: { id: params.id },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    const updatedRecord = await prisma.goodsReceive.update({
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
    const searchParams = request.nextUrl?.searchParams;
    const isPermanent = searchParams?.get('permanent') === 'true' || searchParams?.get('hard') === 'true';

    const record = await prisma.goodsReceive.findUnique({
      where: { id: params.id },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    if (record.status !== 'Inactive' && record.status !== 'Cancelled') {
      try {
        const parsedItems = typeof record.items === 'string' ? JSON.parse(record.items) : record.items;
        if (Array.isArray(parsedItems)) {
          for (const item of parsedItems) {
            const qty = Number(item.receivedQty !== undefined ? item.receivedQty : (item.quantity !== undefined ? item.quantity : (item.qty || 0)));
            const itemId = item.itemId || item.id;
            const warehouse = item.warehouse || 'medical_store';
            if (qty > 0 && itemId) {
              const existingStock = await prisma.stockBalance.findUnique({
                where: { itemId_warehouse: { itemId, warehouse } },
              });
              if (existingStock) {
                const newQty = Math.max(0, existingStock.quantity - qty);
                await prisma.stockBalance.update({
                  where: { id: existingStock.id },
                  data: { quantity: newQty, lastUpdated: new Date() },
                });
              }

              if (item.batchNo) {
                const batch = await prisma.medicalBatch.findFirst({
                  where: { itemId, batchNo: item.batchNo, warehouse },
                });
                if (batch) {
                  const newBatchQty = Math.max(0, batch.quantity - qty);
                  await prisma.medicalBatch.update({
                    where: { id: batch.id },
                    data: { quantity: newBatchQty, status: newBatchQty <= 0 ? 'Exhausted' : batch.status },
                  });
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Error reversing GRV stock:', err);
      }
    }

    // Permanently purge from database if already Inactive or explicitly requested
    if (record.status === 'Inactive' || isPermanent) {
      await prisma.goodsReceive.delete({
        where: { id: params.id },
      });

      return NextResponse.json({
        success: true,
        message: 'GRV permanently deleted from database.',
        permanent: true,
      });
    }

    // Soft delete - set status to Inactive
    const deletedRecord = await prisma.goodsReceive.update({
      where: { id: params.id },
      data: { status: 'Inactive' },
    });

    return NextResponse.json({
      success: true,
      message: 'GRV marked as Inactive and inventory deducted. Delete again to permanently remove.',
      data: deletedRecord,
      permanent: false,
    });
  } catch (error: any) {
    console.error('Error deleting record:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
