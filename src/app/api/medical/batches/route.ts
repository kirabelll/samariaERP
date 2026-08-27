import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const itemId = searchParams.get('itemId') || '';
    const warehouse = searchParams.get('warehouse') || '';

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (search) {
      whereClause.batchNo = { contains: search, mode: 'insensitive' };
    }
    if (status) {
      whereClause.status = status;
    }
    if (itemId) {
      whereClause.itemId = itemId;
    }
    if (warehouse) {
      whereClause.warehouse = warehouse;
    }

    const [data, total] = await Promise.all([
      prisma.medicalBatch.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: { item: true },
        orderBy: { expiryDate: 'asc' },
      }),
      prisma.medicalBatch.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching medical batches:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if payload is an array of items or contains items array
    const rawItems = Array.isArray(body)
      ? body
      : Array.isArray(body.items)
      ? body.items
      : [body];

    if (!rawItems || rawItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No items provided for batch intake' },
        { status: 400 }
      );
    }

    const defaultWarehouse = body.warehouse || 'medical_store';
    const defaultSupplierId = body.supplierId || null;
    const defaultStatus = body.status || 'Available';

    const createdBatches: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < rawItems.length; i++) {
      const item = rawItems[i];
      const itemId = item.itemId;
      const batchNo = item.batchNo?.trim();
      const expiryDate = item.expiryDate;
      const quantity = Number(item.quantity || 0);
      const costPrice = Number(item.costPrice || 0);
      const warehouse = item.warehouse || defaultWarehouse;
      const status = item.status || defaultStatus;
      const supplierId = item.supplierId || defaultSupplierId;

      if (!itemId || !batchNo || !expiryDate || quantity <= 0) {
        errors.push(`Row ${i + 1}: Missing required fields (Item, Batch No, Expiry Date, Quantity > 0)`);
        continue;
      }

      // Check if batch already exists
      const existing = await prisma.medicalBatch.findUnique({
        where: {
          itemId_batchNo_warehouse: {
            itemId,
            batchNo,
            warehouse,
          },
        },
      });

      if (existing) {
        // Update quantity and cost price if already exists
        const updated = await prisma.medicalBatch.update({
          where: { id: existing.id },
          data: {
            quantity: existing.quantity + quantity,
            costPrice: costPrice > 0 ? costPrice : existing.costPrice,
            expiryDate: new Date(expiryDate),
            supplierId: supplierId || existing.supplierId,
            status,
          },
          include: { item: true },
        });
        createdBatches.push(updated);
      } else {
        const batch = await prisma.medicalBatch.create({
          data: {
            itemId,
            batchNo,
            expiryDate: new Date(expiryDate),
            quantity,
            costPrice,
            warehouse,
            status,
            supplierId,
          },
          include: { item: true },
        });
        createdBatches.push(batch);
      }
    }

    if (createdBatches.length === 0 && errors.length > 0) {
      return NextResponse.json(
        { success: false, error: errors.join('. ') },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: createdBatches.length === 1 ? createdBatches[0] : createdBatches,
        count: createdBatches.length,
        warnings: errors.length > 0 ? errors : undefined,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating medical batch:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
