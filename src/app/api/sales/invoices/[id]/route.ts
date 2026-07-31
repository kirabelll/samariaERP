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
            companyName: true,
            code: true,
          },
        },
        salesOrder: {
          select: {
            id: true,
            orderNo: true,
            status: true,
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

    // Fetch related aggregate dispatches for this customer
    const dispatches = await prisma.aggregateDelivery.findMany({
      where: { customerId: record.customerId },
      select: {
        id: true,
        dispatchNo: true,
        loadedVolume: true,
        deliveredVolume: true,
        shortageVolume: true,
        transportRate: true,
        aggregateValue: true,
        grossTruckFee: true,
        shortageDeduction: true,
        netTruckPayment: true,
        dispatchDate: true,
        status: true,
        driverName: true,
      },
      orderBy: { dispatchDate: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...record,
        deliveries,
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
