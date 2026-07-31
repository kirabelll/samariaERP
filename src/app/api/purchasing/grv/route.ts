import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notify } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { grvNo: { contains: search, mode: 'insensitive' } },
        { supplier: { companyName: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (status) {
      whereClause.status = status;
    }

    const [data, total] = await Promise.all([
      prisma.goodsReceive.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: { supplier: true, purchaseOrder: { include: { supplier: true } } },
        orderBy: { receivedDate: 'desc' },
      }),
      prisma.goodsReceive.count({ where: whereClause }),
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
    console.error('Error fetching GRVs:', error);
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
      supplierId,
      purchaseOrderId,
      items,
      totalAmount,
      receivedBy,
      receivedDate,
      status,
    } = body;

    if (!supplierId || !items || !totalAmount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: supplierId, items, totalAmount' },
        { status: 400 }
      );
    }

    // Generate GRV number
    const count = await prisma.goodsReceive.count();
    const grvNo = `GRV-${String(count + 1).padStart(7, '0')}`;

    const grv = await prisma.goodsReceive.create({
      data: {
        grvNo,
        supplierId,
        purchaseOrderId: purchaseOrderId || null,
        items: JSON.stringify(items),
        totalAmount,
        receivedBy: receivedBy || null,
        receivedDate: receivedDate ? new Date(receivedDate) : new Date(),
        status: status || 'Received',
      },
      include: { supplier: true, purchaseOrder: { include: { supplier: true } } },
    });

    notify({ module: 'PURCHASING', event: 'grv_received', details: { grvNo: grv.grvNo, totalAmount: grv.totalAmount } });

    return NextResponse.json(
      { success: true, data: grv },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating GRV:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
