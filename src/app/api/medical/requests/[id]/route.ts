import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const record = await prisma.medicalRequest.findUnique({
      where: { id: params.id },
      include: {
        customer: {
          select: {
            companyName: true,
            code: true,
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

    // Parse and enrich items with item details from DB
    let parsedItems: any[] = [];
    if (record.items) {
      try {
        parsedItems = typeof record.items === 'string' ? JSON.parse(record.items) : record.items;
      } catch {
        parsedItems = [];
      }
    }

    if (Array.isArray(parsedItems) && parsedItems.length > 0) {
      const itemIds = parsedItems
        .map((i: any) => i.itemId || i.id)
        .filter((id: any): id is string => typeof id === 'string' && id.length > 0);

      if (itemIds.length > 0) {
        const dbItems = await prisma.item.findMany({
          where: { id: { in: itemIds } },
          select: {
            id: true,
            code: true,
            name: true,
            genericName: true,
            strength: true,
            unit: true,
          },
        });

        const itemMap = new Map(dbItems.map((item) => [item.id, item]));

        parsedItems = parsedItems.map((item: any) => {
          const targetId = item.itemId || item.id;
          const dbItem = targetId ? itemMap.get(targetId) : undefined;

          return {
            ...item,
            itemId: item.itemId || item.id || '',
            itemName: item.drugName || item.itemName || dbItem?.name || item.name || item.itemId || 'N/A',
            itemCode: item.code || item.itemCode || dbItem?.code,
            genericName: item.genericName || dbItem?.genericName,
            strength: item.strength || dbItem?.strength,
            unit: item.unit || dbItem?.unit,
            batchPref: item.batchPref || item.batchPreference || (record as any).batchPreference || null,
            expiryDate: item.expiryDate || item.expiredDate || (record as any).expiryDate || null,
          };
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...record,
        parsedItems,
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
    const { id: _id, customer: _customer, ...updateData } = body;

    const record = await prisma.medicalRequest.findUnique({
      where: { id: params.id },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    const updatedRecord = await prisma.medicalRequest.update({
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
    const record = await prisma.medicalRequest.findUnique({
      where: { id: params.id },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    // Soft delete - set status to Inactive/Cancelled
    const deletedRecord = await prisma.medicalRequest.update({
      where: { id: params.id },
      data: { status: 'Inactive' },
    });

    return NextResponse.json({ success: true, message: 'Record deleted successfully', data: deletedRecord });
  } catch (error: any) {
    console.error('Error deleting record:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
