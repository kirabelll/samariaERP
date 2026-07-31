import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const itemId = searchParams.get('itemId') || '';

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (itemId) {
      whereClause.itemId = itemId;
    }
    const [pricings, total] = await Promise.all([
      prisma.medicalPricing.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { effectiveDate: 'desc' },
      }),
      prisma.medicalPricing.count({ where: whereClause }),
    ]);

    // Manually join item names and genericName
    const itemIds = Array.from(new Set(pricings.map((p: any) => p.itemId))) as string[];
    const items = itemIds.length > 0
      ? await prisma.item.findMany({ where: { id: { in: itemIds } }, select: { id: true, name: true, genericName: true } })
      : [];
    const itemMap = Object.fromEntries(items.map((i: any) => [i.id, { name: i.name, genericName: i.genericName }]));
    const data = pricings.map((p: any) => ({
      ...p,
      item: itemMap[p.itemId] || { name: p.itemId, genericName: null },
      costPrice: p.totalCost,
      sellingPrice: p.approvedPrice || p.recommendedPrice,
      margin: p.marginPercent,
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
    console.error('Error fetching medical pricing:', error);
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
      manufacturerPrice,
      freight,
      insurance,
      customs,
      inlandTransport,
      bankCost,
      warehouseCost,
      handlingCost,
      wastageAllowance,
      otherCosts,
      marginPercent,
      approvedBy,
    } = body;

    if (!itemId) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: itemId' },
        { status: 400 }
      );
    }

    // Calculate total cost
    const totalCost =
      (manufacturerPrice || 0) +
      (freight || 0) +
      (insurance || 0) +
      (customs || 0) +
      (inlandTransport || 0) +
      (bankCost || 0) +
      (warehouseCost || 0) +
      (handlingCost || 0) +
      (wastageAllowance || 0) +
      (otherCosts || 0);

    // Calculate recommended price
    const margin = (marginPercent || 0) / 100;
    const recommendedPrice = totalCost * (1 + margin);

    const pricing = await prisma.medicalPricing.create({
      data: {
        itemId,
        manufacturerPrice: manufacturerPrice || 0,
        freight: freight || 0,
        insurance: insurance || 0,
        customs: customs || 0,
        inlandTransport: inlandTransport || 0,
        bankCost: bankCost || 0,
        warehouseCost: warehouseCost || 0,
        handlingCost: handlingCost || 0,
        wastageAllowance: wastageAllowance || 0,
        otherCosts: otherCosts || 0,
        totalCost,
        marginPercent: marginPercent || 0,
        recommendedPrice,
        approvedBy: approvedBy || null,
        approvedPrice: null,
        effectiveDate: new Date(),
      },
    });

    return NextResponse.json(
      { success: true, data: pricing },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating medical pricing:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
