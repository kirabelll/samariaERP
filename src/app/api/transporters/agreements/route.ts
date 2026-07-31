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
    const transporterId = searchParams.get('transporterId') || '';
    const includeVoid = searchParams.get('includeVoid') === 'true';

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (search) {
      whereClause.OR = [
        { agreementNo: { contains: search, mode: 'insensitive' } },
        { transporter: { companyName: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (status) {
      whereClause.status = status;
    } else if (!includeVoid) {
      whereClause.status = { not: 'Void' };
    }
    if (transporterId) {
      whereClause.transporterId = transporterId;
    }

    const [data, total] = await Promise.all([
      prisma.transporterAgreement.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          transporter: {
            select: {
              id: true,
              companyName: true,
              code: true,
              phone: true,
              email: true,
              driverName: true,
              association: { select: { id: true, name: true } },
              trucks: { select: { id: true, plateNo: true, truckType: true, capacity: true, capacityUnit: true } },
            },
          },
          pricingItems: true,
          agreementItems: true,
        },
      }),
      prisma.transporterAgreement.count({ where: whereClause }),
    ]);

    // Enrich with supplier + item names
    const supplierIds = Array.from(new Set(data.map((a: any) => a.supplierId).filter(Boolean))) as string[];
    const itemIds = Array.from(
      new Set(
        data.flatMap((a: any) => (a.agreementItems || []).map((ai: any) => ai.itemId))
      )
    ) as string[];

    const [suppliers, itemRecords] = await Promise.all([
      supplierIds.length > 0
        ? prisma.supplier.findMany({
            where: { id: { in: supplierIds } },
            select: { id: true, companyName: true, code: true, category: true },
          })
        : [],
      itemIds.length > 0
        ? prisma.item.findMany({
            where: { id: { in: itemIds } },
            select: { id: true, name: true, code: true, category: true, unit: true },
          })
        : [],
    ]);
    const supplierMap = Object.fromEntries(suppliers.map((s: any) => [s.id, s]));
    const itemMap = Object.fromEntries(itemRecords.map((i: any) => [i.id, i]));

    const enrichedData = data.map((a: any) => ({
      ...a,
      supplier: a.supplierId ? supplierMap[a.supplierId] || null : null,
      agreementItems: (a.agreementItems || []).map((ai: any) => ({
        ...ai,
        item: itemMap[ai.itemId] || null,
      })),
    }));

    return NextResponse.json({
      success: true,
      data: enrichedData,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching transporter agreements:', error);
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
      transporterId,
      supplierId,
      supplierAgreementId,
      productType,
      validFrom,
      validTo,
      terms,
      status,
      loadingSite,
      offloadingSite,
      deliverySites,
      pricePerUnit,
      aggregateValue,
      unitType,
      amount,
      loadSize,
      associationServiceCharge,
      associationChargeEnabled,
      pricingItems,
      agreementItems,
    } = body;

    if (!transporterId || !productType || !validFrom || !validTo) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: transporterId, productType, validFrom, validTo' },
        { status: 400 }
      );
    }

    // Auto-void all existing non-voided agreements for this transporter
    await prisma.transporterAgreement.updateMany({
      where: {
        transporterId,
        status: { notIn: ['Void', 'Cancelled', 'Expired'] },
      },
      data: { status: 'Void' },
    });

    // Generate agreement number
    const count = await prisma.transporterAgreement.count();
    const agreementNo = `TA-${String(count + 1).padStart(6, '0')}`;

    const result = await prisma.$transaction(async (tx) => {
      const agreement = await tx.transporterAgreement.create({
        data: {
          agreementNo,
          transporterId,
          supplierId: supplierId || null,
          supplierAgreementId: supplierAgreementId || null,
          productType,
          validFrom: new Date(validFrom),
          validTo: new Date(validTo),
          terms: terms || null,
          loadingSite: loadingSite || null,
          offloadingSite: offloadingSite || null,
          deliverySites: deliverySites ? JSON.stringify(deliverySites) : null,
          pricePerUnit: pricePerUnit ? parseFloat(pricePerUnit) : null,
          aggregateValue: aggregateValue ? parseFloat(aggregateValue) : null,
          unitType: unitType || null,
          amount: amount ? parseFloat(amount) : null,
          loadSize: loadSize ? parseFloat(loadSize) : null,
          associationServiceCharge: associationServiceCharge ? parseFloat(associationServiceCharge) : 0,
          associationChargeEnabled: associationChargeEnabled || false,
          status: status || 'Active',
        },
      });

      // Create pricing records if provided (backward compatible)
      let pricingRecords: any[] = [];
      if (Array.isArray(pricingItems) && pricingItems.length > 0) {
        pricingRecords = await Promise.all(
          pricingItems.map((item: any) =>
            tx.transporterPricing.create({
              data: {
                agreementId: agreement.id,
                truckCategory: item.truckCategory,
                holdingCapacity: parseFloat(item.holdingCapacity) || 0,
                capacityUnit: item.capacityUnit || 'm3',
                unitPrice: parseFloat(item.unitPrice) || 0,
                totalPrice: (parseFloat(item.holdingCapacity) || 0) * (parseFloat(item.unitPrice) || 0),
              },
            })
          )
        );
      }

      // Create agreement items if provided (backward compatible)
      let agreementItemRecords: any[] = [];
      if (Array.isArray(agreementItems) && agreementItems.length > 0) {
        agreementItemRecords = await Promise.all(
          agreementItems
            .filter((ai: any) => ai.itemId)
            .map((ai: any) =>
              tx.transporterAgreementItem.create({
                data: {
                  agreementId: agreement.id,
                  itemId: ai.itemId,
                  transportRate: parseFloat(ai.transportRate) || 0,
                  aggregateValue: parseFloat(ai.aggregateValue) || 0,
                },
              })
            )
        );
      }

      return { ...agreement, pricingItems: pricingRecords, agreementItems: agreementItemRecords };
    });

    return NextResponse.json(
      { success: true, data: result },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating transporter agreement:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
