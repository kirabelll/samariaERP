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

    const customerId = searchParams.get('customerId') || '';
    const supplierId = searchParams.get('supplierId') || '';
    const transporterId = searchParams.get('transporterId') || '';

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (customerId) {
      if (customerId.includes(',')) {
        whereClause.customerId = { in: customerId.split(',').map((s) => s.trim()).filter(Boolean) };
      } else {
        whereClause.customerId = customerId;
      }
    }
    if (supplierId) {
      if (supplierId.includes(',')) {
        whereClause.supplierId = { in: supplierId.split(',').map((s) => s.trim()).filter(Boolean) };
      } else {
        whereClause.supplierId = supplierId;
      }
    }
    if (transporterId) {
      if (transporterId.includes(',')) {
        whereClause.transporterId = { in: transporterId.split(',').map((s) => s.trim()).filter(Boolean) };
      } else {
        whereClause.transporterId = transporterId;
      }
    }

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

    // Resolve customer, supplier, and item names from their IDs
    const customerIds = Array.from(new Set(records.map((r: any) => r.customerId).filter(Boolean))) as string[];
    const supplierIds = Array.from(new Set(records.map((r: any) => r.supplierId).filter(Boolean))) as string[];
    const itemIds = Array.from(new Set(records.map((r: any) => r.itemId).filter(Boolean))) as string[];

    const [customers, suppliers, items, customerAgreements, supplierAgreements] = await Promise.all([
      customerIds.length > 0 ? prisma.customer.findMany({ where: { id: { in: customerIds } }, select: { id: true, companyName: true, code: true } }) : [],
      supplierIds.length > 0 ? prisma.supplier.findMany({ where: { id: { in: supplierIds } }, select: { id: true, companyName: true, code: true } }) : [],
      itemIds.length > 0 ? prisma.item.findMany({ where: { id: { in: itemIds } }, select: { id: true, name: true, code: true, category: true, unit: true } }) : [],
      customerIds.length > 0 ? prisma.salesAgreement.findMany({
        where: { customerId: { in: customerIds }, status: { notIn: ['Void', 'Cancelled'] } },
        select: { customerId: true, items: true, validFrom: true, validTo: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }) : [],
      supplierIds.length > 0 ? prisma.supplierAgreement.findMany({
        where: { supplierId: { in: supplierIds }, status: { notIn: ['Void', 'Cancelled'] } },
        select: { supplierId: true, items: true, validFrom: true, validTo: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }) : [],
    ]);
    const customerMap = Object.fromEntries(customers.map((c: any) => [c.id, c]));
    const supplierMap = Object.fromEntries(suppliers.map((s: any) => [s.id, s]));
    const itemMap = Object.fromEntries(items.map((i: any) => [i.id, i]));

    const isWithinPeriod = (validFrom: Date | string, validTo: Date | string, dateToTest: Date): boolean => {
      const from = new Date(validFrom);
      from.setHours(0, 0, 0, 0);
      const to = new Date(validTo);
      to.setHours(23, 59, 59, 999);
      const test = new Date(dateToTest);
      return test >= from && test <= to;
    };

    // Helper to resolve agreement price for a specific date and item
    const resolveAgreementPrice = (agreements: any[], partyId: string, itemId: string, dispatchDate: Date): number => {
      const partyAgreements = agreements.filter((a) => (a.customerId || a.supplierId) === partyId);
      const validAgr = partyAgreements.find((a) => isWithinPeriod(a.validFrom, a.validTo, dispatchDate)) || partyAgreements[0];
      if (!validAgr?.items) return 0;
      try {
        const parsed = typeof validAgr.items === 'string' ? JSON.parse(validAgr.items) : (validAgr.items as any[] || []);
        if (Array.isArray(parsed)) {
          const matched = parsed.find((item: any) => (item.itemId || item.id) === itemId);
          if (matched) {
            const unitPrice = Number(matched.unitPrice ?? matched.pricePerUnit ?? matched.price ?? 0);
            const qty = Number(matched.qty || matched.quantity || 1);
            const totalAmt = Number(matched.totalAmount || matched.amount || matched.total || 0);
            if (unitPrice > 0) return unitPrice;
            if (totalAmt > 0 && qty > 0) {
              return Math.round((totalAmt / qty) * 100) / 100;
            }
          }
        }
      } catch {}
      return 0;
    };

    const data = records.map((r: any) => {
      const loadedVol = Number(r.loadedVolume || 0);
      const deliveredVol = Number(r.deliveredVolume ?? r.loadedVolume ?? 0);
      const dispatchDate = new Date(r.dispatchDate);

      // Supplier pricing (from Supplier Agreement valid on dispatchDate or dispatch aggregateValue)
      const agreementSuppPrice = resolveAgreementPrice(supplierAgreements, r.supplierId, r.itemId, dispatchDate);
      const supplierPrice = agreementSuppPrice > 0 ? agreementSuppPrice : Number(r.aggregateValue || 0);
      const supplierPayable = deliveredVol * supplierPrice;

      // Customer pricing (from dispatch metadata override or Customer Agreement valid on dispatchDate)
      let customerPrice = 0;
      if (r.registeredBy && typeof r.registeredBy === 'string' && r.registeredBy.startsWith('{')) {
        try {
          const meta = JSON.parse(r.registeredBy);
          if (meta.customerPrice && Number(meta.customerPrice) > 0) {
            customerPrice = Number(meta.customerPrice);
          }
        } catch {}
      }
      if (customerPrice <= 0) {
        const agreementCustPrice = resolveAgreementPrice(customerAgreements, r.customerId, r.itemId, dispatchDate);
        customerPrice = agreementCustPrice > 0 ? agreementCustPrice : supplierPrice;
      }
      const customerReceivable = loadedVol * customerPrice;

      // Transporter pricing (Freight delivery cost)
      const grossTruckFee = Number(r.grossTruckFee || 0);
      const transporterPayable = Number(r.netTruckPayment || r.grossTruckFee || 0);
      const netMaterialAmount = customerReceivable - supplierPayable - grossTruckFee;

      return {
        ...r,
        customer: customerMap[r.customerId] || null,
        supplier: supplierMap[r.supplierId] || null,
        item: itemMap[r.itemId] || null,
        customerPrice,
        supplierPrice,
        customerReceivable: Math.round(customerReceivable * 100) / 100,
        supplierPayable: Math.round(supplierPayable * 100) / 100,
        netMaterialAmount: Math.round(netMaterialAmount * 100) / 100,
        transporterPayable: Math.round(transporterPayable * 100) / 100,
      };
    });

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
    const aggValue = parseFloat((body.customerPrice || aggregateValue) as any);
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
