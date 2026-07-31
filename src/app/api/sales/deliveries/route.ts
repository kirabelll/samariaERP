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
    const division = searchParams.get('division') || '';

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { deliveryNo: { contains: search, mode: 'insensitive' } },
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
      prisma.delivery.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: { customer: true, salesOrder: true },
        orderBy: { deliveryDate: 'desc' },
      }),
      prisma.delivery.count({ where: whereClause }),
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
    console.error('Error fetching deliveries:', error);
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
      salesOrderId,
      division,
      items,
      driverName,
      truckPlateNo,
      deliveryDate,
      status,
      registeredBy,
    } = body;

    if (!customerId || !division || !items) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: customerId, division, items' },
        { status: 400 }
      );
    }

    // Validate that customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Customer not found' },
        { status: 404 }
      );
    }

    // Parse items if it's a string (JSON)
    let parsedItems = items;
    if (typeof items === 'string') {
      parsedItems = JSON.parse(items);
    }

    // Validate items
    if (!Array.isArray(parsedItems) || parsedItems.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Items must be a non-empty array' },
        { status: 400 }
      );
    }

    // Generate delivery number
    const count = await prisma.delivery.count();
    const deliveryNo = `DEL-${String(count + 1).padStart(7, '0')}`;

    const delivery = await prisma.delivery.create({
      data: {
        deliveryNo,
        customerId,
        salesOrderId: salesOrderId || null,
        division,
        items: typeof items === 'string' ? items : JSON.stringify(items),
        driverName: driverName || null,
        truckPlateNo: truckPlateNo || null,
        deliveryDate: deliveryDate ? new Date(deliveryDate) : new Date(),
        status: status || 'Pending',
        registeredBy: registeredBy || null,
      },
      include: { customer: true, salesOrder: true },
    });

    notify({ module: 'SALES', event: 'delivery_created', details: { deliveryNo: delivery.deliveryNo, driverName: delivery.driverName, truckPlateNo: delivery.truckPlateNo } });

    return NextResponse.json(
      { success: true, data: delivery },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating delivery:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
