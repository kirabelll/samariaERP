import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notify } from '@/lib/telegram';
import { requestApproval } from '@/lib/approval-workflow';

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
        { poNo: { contains: search, mode: 'insensitive' } },
        { supplier: { companyName: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (status) {
      whereClause.status = status;
    }

    const [data, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: { supplier: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.purchaseOrder.count({ where: whereClause }),
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
    console.error('Error fetching purchase orders:', error);
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
      items,
      totalAmount,
      status,
      requestType,
      approvedBy,
      createdBy,
    } = body;

    if (!supplierId || !items || !totalAmount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: supplierId, items, totalAmount' },
        { status: 400 }
      );
    }

    // Generate PO number
    const count = await prisma.purchaseOrder.count();
    const poNo = `PO-${String(count + 1).padStart(7, '0')}`;

    const order = await prisma.purchaseOrder.create({
      data: {
        poNo,
        supplierId,
        items: JSON.stringify(items),
        totalAmount,
        status: status || 'Draft',
        requestType: requestType || 'purchase_order',
        approvedBy: approvedBy || null,
        createdBy: createdBy || null,
      },
      include: { supplier: true },
    });

    notify({ module: 'PURCHASING', event: 'po_created', details: { poNo: order.poNo, totalAmount: order.totalAmount } });

    // PO starts as Draft — user must explicitly submit for approval from detail page

    return NextResponse.json(
      { success: true, data: order },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating purchase order:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
