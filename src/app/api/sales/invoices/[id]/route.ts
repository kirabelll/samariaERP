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
    const { searchParams } = new URL(request.url);
    const isPermanent = searchParams.get('permanent') === 'true';

    const record = await prisma.salesInvoice.findUnique({
      where: { id: params.id },
      include: {
        payments: true,
      },
    });

    if (!record) {
      return NextResponse.json(
        { success: false, error: 'Record not found' },
        { status: 404 }
      );
    }

    if (isPermanent) {
      // Permanent deletion - only allow for inactive invoices
      if (record.status !== 'Inactive') {
        return NextResponse.json(
          { success: false, error: 'Only inactive invoices can be permanently deleted. Deactivate the invoice first.' },
          { status: 400 }
        );
      }

      // Check for any active payments
      if (record.payments && record.payments.length > 0) {
        const activePayments = record.payments.filter(p => p.status !== 'Cancelled');
        if (activePayments.length > 0) {
          return NextResponse.json(
            { success: false, error: `Cannot permanently delete invoice with ${activePayments.length} active payment(s). Cancel or delete payments first.` },
            { status: 400 }
          );
        }
      }

      // Use transaction to ensure data consistency
      await prisma.$transaction(async (tx) => {
        // Delete all cancelled payments first
        if (record.payments && record.payments.length > 0) {
          await tx.customerPayment.deleteMany({
            where: { 
              invoiceId: params.id,
              status: 'Cancelled'
            }
          });
        }

        // Delete the invoice permanently
        await tx.salesInvoice.delete({
          where: { id: params.id }
        });
      });

      return NextResponse.json({ 
        success: true, 
        message: `Invoice ${record.invoiceNo} has been permanently deleted from the database`,
        permanent: true
      });
    } else {
      // Soft delete - set status to Inactive
      const deletedRecord = await prisma.salesInvoice.update({
        where: { id: params.id },
        data: { status: 'Inactive' },
      });

      return NextResponse.json({ 
        success: true, 
        message: `Invoice ${record.invoiceNo} has been deactivated. Use "Delete Permanently" to remove from database.`,
        data: deletedRecord,
        permanent: false
      });
    }
  } catch (error: any) {
    console.error('Error deleting record:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
