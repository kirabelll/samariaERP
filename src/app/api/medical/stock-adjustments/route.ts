import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const itemId = searchParams.get('itemId');
    const adjustmentType = searchParams.get('adjustmentType');
    const warehouse = searchParams.get('warehouse');

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (itemId) {
      whereClause.itemId = itemId;
    }
    if (adjustmentType) {
      whereClause.adjustmentType = adjustmentType;
    }
    if (warehouse) {
      whereClause.warehouse = warehouse;
    }

    const [data, total] = await Promise.all([
      prisma.stockAdjustment.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.stockAdjustment.count({ where: whereClause }),
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
    console.error('Error fetching stock adjustments:', error);
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
      batchId,
      warehouse = 'main',
      adjustmentType,
      previousQty,
      newQty,
      reason,
      approvedBy,
      adjustedBy,
    } = body;

    // Validate required fields
    if (!itemId || adjustmentType === undefined || previousQty === undefined || newQty === undefined) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Auto-generate adjustmentNo: ADJ-YYYYMMDD-XXXX
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await prisma.stockAdjustment.count();
    const sequence = String(count + 1).padStart(4, '0');
    const adjustmentNo = `ADJ-${dateStr}-${sequence}`;

    const difference = newQty - previousQty;

    const adjustment = await prisma.stockAdjustment.create({
      data: {
        adjustmentNo,
        itemId,
        batchId: batchId || null,
        warehouse,
        adjustmentType,
        previousQty,
        newQty,
        difference,
        reason: reason || '',
        approvedBy: approvedBy || null,
        adjustedBy: adjustedBy || null,
      },
    });

    // Update StockBalance for the item/warehouse
    const existingBalance = await prisma.stockBalance.findUnique({
      where: {
        itemId_warehouse: {
          itemId,
          warehouse,
        },
      },
    });

    if (existingBalance) {
      // Update existing balance
      await prisma.stockBalance.update({
        where: { id: existingBalance.id },
        data: {
          quantity: newQty,
          lastUpdated: new Date(),
        },
      });
    } else {
      // Create new balance
      await prisma.stockBalance.create({
        data: {
          itemId,
          warehouse,
          quantity: newQty,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: adjustment,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating stock adjustment:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
