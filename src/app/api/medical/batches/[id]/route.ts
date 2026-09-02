import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const record = await prisma.medicalBatch.findUnique({
      where: { id: params.id },
      include: {
        item: true,
      },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    let supplier: any = null;
    if (record.supplierId) {
      supplier = await prisma.supplier.findUnique({
        where: { id: record.supplierId },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...record,
        supplier,
      },
    });
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
    const { id: _id, item: _item, ...updateData } = body;

    const record = await prisma.medicalBatch.findUnique({
      where: { id: params.id },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    const updatedRecord = await prisma.medicalBatch.update({
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
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const { id } = await (params as any);
    const searchParams = request.nextUrl?.searchParams;
    const isPermanent = searchParams?.get('permanent') === 'true';

    const record = await prisma.medicalBatch.findUnique({
      where: { id },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    // If batch has remaining quantity, adjust StockBalance
    if (record.status !== 'Inactive' && record.quantity > 0) {
      try {
        const existingStock = await prisma.stockBalance.findUnique({
          where: { itemId_warehouse: { itemId: record.itemId, warehouse: record.warehouse } },
        });
        if (existingStock) {
          const newQty = Math.max(0, existingStock.quantity - record.quantity);
          await prisma.stockBalance.update({
            where: { id: existingStock.id },
            data: { quantity: newQty, lastUpdated: new Date() },
          });
        }
      } catch (err) {
        console.error('Error updating stock balance on batch delete:', err);
      }
    }

    // Permanently purge from database if already Inactive or explicitly requested
    if (record.status === 'Inactive' || isPermanent) {
      await prisma.medicalBatch.delete({
        where: { id },
      });

      return NextResponse.json({
        success: true,
        message: 'Stock batch permanently deleted from database.',
        permanent: true,
      });
    }

    // Otherwise mark status as Inactive
    const updatedRecord = await prisma.medicalBatch.update({
      where: { id },
      data: { status: 'Inactive', quantity: 0 },
    });

    return NextResponse.json({
      success: true,
      message: 'Batch marked as Inactive. Delete again to permanently remove.',
      data: updatedRecord,
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
