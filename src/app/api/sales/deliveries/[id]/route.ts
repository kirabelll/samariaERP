import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    // If the delivery is being deleted/cancelled, restore stock
    if (record.status !== 'Inactive' && record.status !== 'Cancelled') {
      let parsedItems: any[] = [];
      try {
        parsedItems = typeof record.items === 'string' ? JSON.parse(record.items) : record.items;
      } catch {
        parsedItems = [];
      }

      const warehouse = record.division === 'MEDICAL' ? 'medical_store' : 'main';
      for (const item of parsedItems) {
        const qtyToRestore = Number(item.qty || item.quantity || 0);
        if (qtyToRestore <= 0) continue;

        let itemId = item.itemId;
        if (!itemId && item.itemName) {
          const matchedItem = await prisma.item.findFirst({
            where: { name: { equals: item.itemName, mode: 'insensitive' } },
          });
          if (matchedItem) itemId = matchedItem.id;
        }

        if (itemId) {
          try {
            // Restore StockBalance
            const existingStock = await prisma.stockBalance.findUnique({
              where: {
                itemId_warehouse: {
                  itemId,
                  warehouse,
                },
              },
            });

            if (existingStock) {
              await prisma.stockBalance.update({
                where: { id: existingStock.id },
                data: {
                  quantity: existingStock.quantity + qtyToRestore,
                  lastUpdated: new Date(),
                },
              });
            }

            // Restore MedicalBatch
            if (item.batchNo) {
              const existingBatch = await prisma.medicalBatch.findFirst({
                where: { itemId, batchNo: item.batchNo },
              });
              if (existingBatch) {
                await prisma.medicalBatch.update({
                  where: { id: existingBatch.id },
                  data: {
                    quantity: existingBatch.quantity + qtyToRestore,
                    status: 'Available',
                  },
                });
              }
            }
          } catch (e) {
            console.error('Error restoring stock on delivery delete:', e);
          }
        }
      }
    }

    // Permanently delete delivery record
    const deletedRecord = await prisma.delivery.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: 'Record permanently deleted and stock restored successfully', data: deletedRecord });
  } catch (error: any) {
    console.error('Error deleting record:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
