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
    const {
      itemId,
      batchNo,
      expiryDate,
      quantity,
      costPrice,
      warehouse,
      status,
      supplierId,
    } = body;

    if (!itemId || !batchNo || !expiryDate || !quantity) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: itemId, batchNo, expiryDate, quantity' },
        { status: 400 }
      );
    }

    // Check if batch already exists
    const existing = await prisma.medicalBatch.findUnique({
      where: {
        itemId_batchNo_warehouse: {
          itemId,
          batchNo,
          warehouse: warehouse || 'medical_store',
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Batch already exists for this item and warehouse' },
        { status: 400 }
      );
    }

    const batch = await prisma.medicalBatch.create({
      data: {
        itemId,
        batchNo,
        expiryDate: new Date(expiryDate),
        quantity,
        costPrice: costPrice || 0,
        warehouse: warehouse || 'medical_store',
        status: status || 'Available',
        supplierId: supplierId || null,
      },
      include: { item: true },
    });

    return NextResponse.json(
      { success: true, data: batch },
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
