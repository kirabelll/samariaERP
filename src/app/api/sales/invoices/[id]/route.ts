import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const record = await prisma.salesInvoice.findUnique({
      where: { id: params.id },
      include: {
        customer: {
          select: {
            id: true,
            companyName: true,
            code: true,
            tin: true,
            phone: true,
            location: true,
          },
        },
        salesOrder: {
          select: {
            id: true,
            orderNo: true,
            status: true,
          },
        },
        cementLifting: {
          include: {
            factory: true,
            truck: true,
            purchase: true,
            customer: true,
          },
        },
      },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    // Fetch related deliveries via salesOrder
    let deliveries: any[] = [];
    if (record.salesOrderId) {
      deliveries = await prisma.delivery.findMany({
        where: { salesOrderId: record.salesOrderId },
        select: {
          id: true,
          deliveryNo: true,
          driverName: true,
          truckPlateNo: true,
          deliveredTo: true,
          deliveryDate: true,
          status: true,
          items: true,
        },
        orderBy: { deliveryDate: 'desc' },
      });
    }

    // Fetch related cement liftings
    let cementLiftings: any[] = [];
    if (record.division === 'CEMENT' || record.liftingId) {
      const liftingFilter: any = {};
      if (record.liftingId) {
        liftingFilter.OR = [
          { id: record.liftingId },
          { customerId: record.customerId },
        ];
      } else {
        liftingFilter.customerId = record.customerId;
      }

      cementLiftings = await prisma.cementLifting.findMany({
        where: liftingFilter,
        include: {
          factory: true,
          truck: true,
          purchase: {
            include: { factory: true },
          },
          customer: true,
        },
        orderBy: { liftingDate: 'desc' },
        take: 30,
      });

      // Fetch linked coupons for liftings
      const couponIds = cementLiftings.map((l: any) => l.couponId).filter(Boolean) as string[];
      if (couponIds.length > 0) {
        const coupons = await prisma.coupon.findMany({
          where: { id: { in: couponIds } },
          select: { id: true, couponNo: true, status: true, tonnage: true },
        });
        const couponMap = Object.fromEntries(coupons.map((c: any) => [c.id, c]));
        cementLiftings = cementLiftings.map((l: any) => ({
          ...l,
          coupon: l.couponId ? couponMap[l.couponId] : null,
        }));
      }
    }

    // Fetch related aggregate dispatches for this customer
    const rawDispatches = await prisma.aggregateDelivery.findMany({
      where: { customerId: record.customerId },
      include: {
        transporter: true,
        truck: true,
      },
      orderBy: { dispatchDate: 'desc' },
      take: 30,
    });

    // Lookup suppliers and items for aggregate deliveries
    const supplierIds = Array.from(new Set(rawDispatches.map((d) => d.supplierId).filter(Boolean)));
    const itemIds = Array.from(new Set(rawDispatches.map((d) => d.itemId).filter(Boolean)));

    const [suppliers, items] = await Promise.all([
      supplierIds.length > 0
        ? prisma.supplier.findMany({ where: { id: { in: supplierIds } }, select: { id: true, companyName: true } })
        : [],
      itemIds.length > 0
        ? prisma.item.findMany({ where: { id: { in: itemIds } }, select: { id: true, name: true } })
        : [],
    ]);

    const supplierMap = new Map<string, any>(suppliers.map((s): [string, any] => [s.id, s]));
    const itemMap = new Map<string, any>(items.map((i): [string, any] => [i.id, i]));

    const dispatches = rawDispatches.map((d) => ({
      ...d,
      supplier: supplierMap.get(d.supplierId) || null,
      item: itemMap.get(d.itemId) || null,
    }));

    return NextResponse.json({
      success: true,
      data: {
        ...record,
        deliveries,
        cementLiftings,
        dispatches,
      },
    });
  } catch (error: any) {
    console.error('Error fetching record:', error);
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
    const body = await request.json();

    // Strip non-updatable, relation objects, and foreign key fields that Prisma rejects in update()
    const {
      id: _id,
      createdAt: _ca,
      updatedAt: _ua,
      customer: _customer,
      salesOrder: _salesOrder,
      payments: _payments,
      customerId: _customerId,
      salesOrderId: _salesOrderId,
      liftingId: _liftingId,
      cementLifting: _cementLifting,
      deliveries: _deliveries,
      dispatches: _dispatches,
      ...updateData
    } = body;

    const record = await prisma.salesInvoice.findUnique({
      where: { id: params.id },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    const updatedRecord = await prisma.salesInvoice.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: updatedRecord });
  } catch (error: any) {
    console.error('Error updating record:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const record = await prisma.salesInvoice.findUnique({
      where: { id: params.id },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    // Soft delete - set status to Inactive/Cancelled
    const deletedRecord = await prisma.salesInvoice.update({
      where: { id: params.id },
      data: { status: 'Inactive' },
    });

    return NextResponse.json({ success: true, message: 'Record deleted successfully', data: deletedRecord });
  } catch (error: any) {
    console.error('Error deleting record:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
