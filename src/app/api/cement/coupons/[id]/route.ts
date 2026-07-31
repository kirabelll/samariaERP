import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const coupon = await prisma.coupon.findUnique({
      where: { id: params.id },
      include: {
        factory: { select: { id: true, name: true, code: true } },
        purchase: {
          select: {
            id: true,
            purchaseNo: true,
            cementType: true,
            quantityTons: true,
            unitPrice: true,
            totalAmount: true,
            status: true,
            factory: { select: { name: true } },
          },
        },
        purchaseOrder: { select: { id: true, poNo: true } },
      },
    });

    if (!coupon) {
      return NextResponse.json(
        { success: false, error: 'Coupon not found' },
        { status: 404 }
      );
    }

    // Find liftings that used this coupon
    const liftings = await prisma.cementLifting.findMany({
      where: { couponId: coupon.id },
      include: {
        truck: { select: { plateNo: true, driverName: true } },
        factory: { select: { name: true } },
      },
      orderBy: { liftingDate: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: { ...coupon, liftings },
    });
  } catch (error: any) {
    console.error('Error fetching coupon:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const coupon = await prisma.coupon.findUnique({
      where: { id: params.id },
    });

    if (!coupon) {
      return NextResponse.json(
        { success: false, error: 'Coupon not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { id, createdAt, factory, purchase, purchaseOrder, liftings, ...updateData } = body;

    const updated = await prisma.coupon.update({
      where: { id: params.id },
      data: updateData,
      include: {
        factory: { select: { id: true, name: true, code: true } },
        purchase: { select: { id: true, purchaseNo: true } },
        purchaseOrder: { select: { id: true, poNo: true } },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Error updating coupon:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
