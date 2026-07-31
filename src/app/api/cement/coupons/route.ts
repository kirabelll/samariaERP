import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || '';
    const factoryId = searchParams.get('factoryId') || '';

    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }
    if (factoryId) {
      whereClause.factoryId = factoryId;
    }

    const [data, total] = await Promise.all([
      prisma.coupon.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          factory: { select: { id: true, name: true } },
          purchase: { select: { id: true, purchaseNo: true } },
          purchaseOrder: { select: { id: true, poNo: true } },
        },
      }),
      prisma.coupon.count({ where: whereClause }),
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
    console.error('Error fetching coupons:', error);
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
      couponNo,
      factoryId,
      purchaseId,
      purchaseOrderId,
      tonnage,
      collectedDate,
      collectedBy,
      notes,
    } = body;

    if (!couponNo || !factoryId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: couponNo, factoryId' },
        { status: 400 }
      );
    }

    // Check for duplicate coupon number
    const existing = await prisma.coupon.findUnique({ where: { couponNo } });
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Coupon number already exists' },
        { status: 400 }
      );
    }

    // Verify factory exists
    const factory = await prisma.factory.findUnique({ where: { id: factoryId } });
    if (!factory) {
      return NextResponse.json(
        { success: false, error: 'Factory not found' },
        { status: 404 }
      );
    }

    // Use provided purchaseId, or find an active cement purchase for this factory
    let finalPurchaseId: string;
    let purchaseQty: number;
    if (purchaseId) {
      const purchase = await prisma.cementPurchase.findUnique({ where: { id: purchaseId } });
      if (!purchase) {
        return NextResponse.json(
          { success: false, error: 'Cement Purchase not found' },
          { status: 404 }
        );
      }
      // Only allow coupon creation for Active purchases (approved AND paid)
      if (purchase.status !== 'Active') {
        return NextResponse.json(
          { success: false, error: 'Cannot create coupons: purchase must be approved and paid first. Current status: ' + purchase.status },
          { status: 400 }
        );
      }
      finalPurchaseId = purchaseId;
      purchaseQty = Number(purchase.quantityTons);
    } else {
      const activePurchase = await prisma.cementPurchase.findFirst({
        where: {
          factoryId,
          status: 'Active',
        },
        orderBy: { createdAt: 'desc' },
      });
      if (!activePurchase) {
        return NextResponse.json(
          { success: false, error: 'No active Cement Purchase found for this factory. A purchase must be approved and paid before coupons can be created.' },
          { status: 400 }
        );
      }
      finalPurchaseId = activePurchase.id;
      purchaseQty = Number(activePurchase.quantityTons);
    }

    // Validate: total coupon tonnage must not exceed the purchase quantity
    const couponTonnage = tonnage ? parseFloat(tonnage) : 0;
    if (couponTonnage > 0) {
      const existingCoupons = await prisma.coupon.aggregate({
        where: {
          purchaseId: finalPurchaseId,
          status: { notIn: ['CANCELLED', 'EXPIRED'] },
        },
        _sum: { tonnage: true },
      });
      const usedTonnage = existingCoupons._sum.tonnage || 0;
      const remainingTonnage = purchaseQty - usedTonnage;

      if (couponTonnage > remainingTonnage) {
        return NextResponse.json(
          {
            success: false,
            error: `Coupon tonnage (${couponTonnage} QT) exceeds remaining purchase capacity. Purchase: ${purchaseQty} QT, Already allocated: ${usedTonnage} QT, Available: ${remainingTonnage} QT.`,
          },
          { status: 400 }
        );
      }
    }

    const coupon = await prisma.coupon.create({
      data: {
        couponNo,
        factoryId,
        purchaseId: finalPurchaseId,
        purchaseOrderId: purchaseOrderId || null,
        tonnage: tonnage ? parseFloat(tonnage) : null,
        collectedDate: collectedDate ? new Date(collectedDate) : new Date(),
        collectedBy: collectedBy || null,
        notes: notes || null,
        status: 'COLLECTED',
      },
      include: {
        factory: { select: { id: true, name: true } },
        purchase: { select: { id: true, purchaseNo: true } },
        purchaseOrder: { select: { id: true, poNo: true } },
      },
    });

    return NextResponse.json(
      { success: true, data: coupon },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating coupon:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
