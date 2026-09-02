import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notify } from '@/lib/telegram';
import { deductInventory } from '@/lib/inventory';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const division = searchParams.get('division') || '';

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { orderNo: { contains: search, mode: 'insensitive' } },
        { customer: { companyName: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (status) {
      whereClause.status = status;
    }
    if (division) {
      whereClause.division = division;
    }

    const [data, total] = await Promise.all([
      prisma.salesOrder.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: { customer: true, proforma: true },
        orderBy: { orderDate: 'desc' },
      }),
      prisma.salesOrder.count({ where: whereClause }),
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
    console.error('Error fetching sales orders:', error);
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
      customerId,
      proformaId,
      division,
      items,
      totalAmount,
      status,
      createdBy,
    } = body;

    if (!customerId || !items || !totalAmount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: customerId, items, totalAmount' },
        { status: 400 }
      );
    }

    // Validate division against Prisma enum
    const validDivisions = ['CONSTRUCTION', 'MEDICAL', 'CEMENT', 'AGGREGATE', 'GENERAL', 'BOTH'];
    const safeDivision = validDivisions.includes(division) ? division : 'CONSTRUCTION';

    // Generate order number
    const count = await prisma.salesOrder.count();
    const orderNo = `ORD-${String(count + 1).padStart(7, '0')}`;

    const order = await prisma.salesOrder.create({
      data: {
        orderNo,
        customerId,
        proformaId: proformaId || null,
        division: safeDivision,
        items: JSON.stringify(items),
        totalAmount,
        status: status || 'Pending',
        createdBy: createdBy || null,
      },
      include: { customer: true, proforma: true },
    });

    // Deduct stock balance and batches for ordered items
    try {
      await deductInventory(items, safeDivision, { orderNo: order.orderNo });
    } catch (invErr) {
      console.error('Error deducting inventory for sales order:', invErr);
    }

    notify({ module: 'SALES', event: 'order_created', details: { orderNo: order.orderNo, customer: order.customer?.companyName, totalAmount: order.totalAmount, division: order.division } });

    return NextResponse.json(
      { success: true, data: order },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating sales order:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
