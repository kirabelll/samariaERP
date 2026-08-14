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
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';

    const sortBy = searchParams.get('sortBy') || 'dispatchNo';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    let orderByClause: any = { dispatchNo: 'asc' };
    if (sortBy) {
      const validFields = ['dispatchNo', 'dispatchDate', 'padNumber', 'loadedVolume', 'deliveredVolume', 'status'];
      if (validFields.includes(sortBy)) {
        orderByClause = { [sortBy]: sortOrder.toLowerCase() === 'desc' ? 'desc' : 'asc' };
      }
    }

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { dispatchNo: { contains: search, mode: 'insensitive' } },
        { padNumber: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) {
      whereClause.status = status;
    }
    if (startDate || endDate) {
      whereClause.dispatchDate = {};
      if (startDate) {
        whereClause.dispatchDate.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.dispatchDate.lte = new Date(endDate);
      }
    }

    const [records, total] = await Promise.all([
      prisma.aggregateDelivery.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          transporter: true,
          truck: true,
        },
        orderBy: orderByClause,
      }),
      prisma.aggregateDelivery.count({ where: whereClause }),
    ]);

    // Resolve customer and supplier names from their IDs
    const customerIds = Array.from(new Set(records.map((r: any) => r.customerId).filter(Boolean))) as string[];
    const supplierIds = Array.from(new Set(records.map((r: any) => r.supplierId).filter(Boolean))) as string[];
    const [customers, suppliers] = await Promise.all([
      customerIds.length > 0 ? prisma.customer.findMany({ where: { id: { in: customerIds } }, select: { id: true, companyName: true, code: true } }) : [],
      supplierIds.length > 0 ? prisma.supplier.findMany({ where: { id: { in: supplierIds } }, select: { id: true, companyName: true, code: true } }) : [],
    ]);
    const customerMap = Object.fromEntries(customers.map((c: any) => [c.id, c]));
    const supplierMap = Object.fromEntries(suppliers.map((s: any) => [s.id, s]));
    const data = records.map((r: any) => ({
      ...r,
      customer: customerMap[r.customerId] || null,
      supplier: supplierMap[r.supplierId] || null,
    }));

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
    console.error('Error fetching aggregate deliveries:', error);
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
      supplierId,
      transporterId,
      truckId,
      itemId,
      agreementId,
      driverName,
      loadedVolume,
      deliveredVolume,
      transportRate,
      aggregateValue,
      telegramProof,
      signedInvoice,
      dispatchDate,
      deliveryDate,
      registeredBy,
      padNumber,
    } = body;

    if (!customerId || !supplierId || !transporterId || !truckId || !itemId || !loadedVolume || !transportRate || !aggregateValue || !driverName || !padNumber) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: customerId, supplierId, transporterId, truckId, itemId, loadedVolume, transportRate, aggregateValue, driverName, padNumber' },
        { status: 400 }
      );
    }

    // Validate that all referenced records exist
    const [customer, supplier, transporter, truck, item] = await Promise.all([
      prisma.customer.findUnique({ where: { id: customerId } }),
      prisma.supplier.findUnique({ where: { id: supplierId } }),
      prisma.transporter.findUnique({ where: { id: transporterId } }),
      prisma.truck.findUnique({ where: { id: truckId } }),
      prisma.item.findUnique({ where: { id: itemId } }),
    ]);

    if (!customer || !supplier || !transporter || !truck || !item) {
      return NextResponse.json(
        { success: false, error: 'One or more referenced records not found' },
        { status: 404 }
      );
    }

    // Generate dispatch number using findFirst to avoid duplicates
    const lastDispatch = await prisma.aggregateDelivery.findFirst({
      orderBy: { dispatchNo: 'desc' },
      select: { dispatchNo: true },
    });
    let nextSeq = 1;
    if (lastDispatch?.dispatchNo) {
      const match = lastDispatch.dispatchNo.match(/DISP-(\d+)/);
      if (match) nextSeq = parseInt(match[1], 10) + 1;
    }
    const dispatchNo = `DISP-${String(nextSeq).padStart(7, '0')}`;

    // Convert to numbers
    const loaded = parseFloat(loadedVolume as any);
    const transported = parseFloat(transportRate as any);
    const aggValue = parseFloat(aggregateValue as any);
    const delivered = deliveredVolume ? parseFloat(deliveredVolume as any) : null;

    // Cap billable volume at truck capacity — net pay never exceeds truck capacity × rate
    const truckCapacity = truck.capacity ? parseFloat(String(truck.capacity)) : 0;
    const billableVolume =
      truckCapacity > 0 && loaded > truckCapacity ? truckCapacity : loaded;

    // Calculate shortages based on billable (capped) volume
    const shortageVolume = delivered ? Math.max(0, billableVolume - delivered) : null;
    const grossTruckFee = billableVolume * transported;
    const shortageDeduction = shortageVolume && shortageVolume > 0 ? shortageVolume * aggValue : null;
    const netTruckPayment = shortageDeduction ? grossTruckFee - shortageDeduction : grossTruckFee;

    const delivery = await prisma.aggregateDelivery.create({
      data: {
        dispatchNo,
        customerId,
        supplierId,
        transporterId,
        truckId,
        itemId,
        agreementId: agreementId || null,
        driverName: driverName || null,
        padNumber: padNumber ? String(padNumber).trim() : null,
        loadedVolume: loaded,
        deliveredVolume: delivered || null,
        shortageVolume: shortageVolume || null,
        transportRate: transported,
        aggregateValue: aggValue,
        grossTruckFee,
        shortageDeduction: shortageDeduction || null,
        netTruckPayment,
        telegramProof: telegramProof || null,
        signedInvoice: signedInvoice || null,
        dispatchDate: dispatchDate ? new Date(dispatchDate) : new Date(),
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        status: 'Dispatched',
        registeredBy: registeredBy || null,
      },
      include: {
        transporter: true,
        truck: true,
      },
    });

    notify({
      module: 'AGGREGATE',
      event: 'aggregate_dispatch',
      details: {
        dispatchNo: delivery.dispatchNo,
        customer: customer.companyName,
        supplier: supplier.companyName,
        transporter: transporter.companyName,
        truck: truck.plateNo,
        item: item.name,
        loadedVolume: `${delivery.loadedVolume} m³`,
        transportRate: `ETB ${delivery.transportRate}/m³`,
        grossFee: `ETB ${delivery.grossTruckFee?.toLocaleString('en-US') || '0'}`,
      },
    });

    return NextResponse.json(
      { success: true, data: delivery },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating aggregate delivery:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
