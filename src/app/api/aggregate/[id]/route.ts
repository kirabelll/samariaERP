import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notify } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const delivery = await prisma.aggregateDelivery.findUnique({
      where: { id: params.id },
      include: {
        transporter: true,
        truck: true,
      },
    });

    if (!delivery) {
      return NextResponse.json(
        { success: false, error: 'Aggregate delivery not found' },
        { status: 404 }
      );
    }

    // Resolve customer and supplier names from their IDs
    const [customer, supplier, item] = await Promise.all([
      prisma.customer.findUnique({
        where: { id: delivery.customerId },
        select: { id: true, companyName: true, code: true },
      }),
      prisma.supplier.findUnique({
        where: { id: delivery.supplierId },
        select: { id: true, companyName: true, code: true },
      }),
      prisma.item.findUnique({
        where: { id: delivery.itemId },
        select: { id: true, name: true, code: true, unit: true },
      }),
    ]);

    const data = {
      ...delivery,
      customer,
      supplier,
      item,
    };

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching aggregate delivery:', error);
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
    const delivery = await prisma.aggregateDelivery.findUnique({
      where: { id: params.id },
    });

    if (!delivery) {
      return NextResponse.json(
        { success: false, error: 'Aggregate delivery not found' },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Safe destructuring - strip protected fields
    const { id, createdAt, transporter, truck, customer, supplier, item, ...updateData } = body;

    // Recalculate derived financial fields if volume or rate parameters are present
    const loadedVolume = updateData.loadedVolume !== undefined ? parseFloat(updateData.loadedVolume) : delivery.loadedVolume;
    const deliveredVolume = updateData.deliveredVolume !== undefined
      ? (updateData.deliveredVolume !== null && updateData.deliveredVolume !== '' ? parseFloat(updateData.deliveredVolume) : null)
      : delivery.deliveredVolume;
    const transportRate = updateData.transportRate !== undefined ? parseFloat(updateData.transportRate) : delivery.transportRate;
    const aggregateValue = updateData.aggregateValue !== undefined ? parseFloat(updateData.aggregateValue) : delivery.aggregateValue;

    const truckIdToUse = updateData.truckId || delivery.truckId;
    let truckCapacity = 0;
    if (truckIdToUse) {
      const truckRec = await prisma.truck.findUnique({ where: { id: truckIdToUse } });
      if (truckRec?.capacity) truckCapacity = parseFloat(String(truckRec.capacity));
    }

    const billableVolume = (truckCapacity > 0 && loadedVolume > truckCapacity) ? truckCapacity : loadedVolume;
    const grossTruckFee = billableVolume * transportRate;

    let shortageVolume: number | null = null;
    let shortageDeduction: number | null = null;
    if (deliveredVolume !== null && deliveredVolume !== undefined) {
      shortageVolume = Math.max(0, loadedVolume - deliveredVolume);
      shortageDeduction = shortageVolume * aggregateValue;
    }

    const netTruckPayment = grossTruckFee - (shortageDeduction || 0);

    const dataToSave = {
      ...updateData,
      loadedVolume,
      deliveredVolume,
      transportRate,
      aggregateValue,
      grossTruckFee: updateData.grossTruckFee !== undefined ? parseFloat(updateData.grossTruckFee) : grossTruckFee,
      shortageVolume: updateData.shortageVolume !== undefined ? (updateData.shortageVolume !== null ? parseFloat(updateData.shortageVolume) : null) : shortageVolume,
      shortageDeduction: updateData.shortageDeduction !== undefined ? (updateData.shortageDeduction !== null ? parseFloat(updateData.shortageDeduction) : null) : shortageDeduction,
      netTruckPayment: updateData.netTruckPayment !== undefined ? parseFloat(updateData.netTruckPayment) : netTruckPayment,
      ...(updateData.dispatchDate ? { dispatchDate: new Date(updateData.dispatchDate) } : {}),
      ...(updateData.deliveryDate ? { deliveryDate: new Date(updateData.deliveryDate) } : {}),
    };

    const updatedDelivery = await prisma.aggregateDelivery.update({
      where: { id: params.id },
      data: dataToSave,
      include: {
        transporter: true,
        truck: true,
      },
    });

    // Resolve customer and supplier names
    const [customerData, supplierData, itemData] = await Promise.all([
      prisma.customer.findUnique({
        where: { id: updatedDelivery.customerId },
        select: { id: true, companyName: true, code: true },
      }),
      prisma.supplier.findUnique({
        where: { id: updatedDelivery.supplierId },
        select: { id: true, companyName: true, code: true },
      }),
      prisma.item.findUnique({
        where: { id: updatedDelivery.itemId },
        select: { id: true, name: true, code: true, unit: true },
      }),
    ]);

    const data = {
      ...updatedDelivery,
      customer: customerData,
      supplier: supplierData,
      item: itemData,
    };

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error updating aggregate delivery:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const delivery = await prisma.aggregateDelivery.findUnique({
      where: { id: params.id },
    });

    if (!delivery) {
      return NextResponse.json(
        { success: false, error: 'Aggregate delivery not found' },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Extract allowed fields for partial status/verification update
    const {
      status,
      verifiedBy,
      deliveredVolume,
      shortageVolume,
      grossTruckFee,
      shortageDeduction,
      netTruckPayment,
      padNumber,
      deliveryDate,
    } = body;

    // Build update data
    const updateData: any = {};

    if (status !== undefined) {
      updateData.status = status;
    }

    if (verifiedBy !== undefined) {
      updateData.verifiedBy = verifiedBy;
    }

    if (padNumber !== undefined) {
      updateData.padNumber = padNumber;
    }

    if (deliveryDate !== undefined) {
      updateData.deliveryDate = new Date(deliveryDate);
    }

    if (deliveredVolume !== undefined) {
      updateData.deliveredVolume = deliveredVolume;
    }

    // Auto-calculate shortageVolume if not provided
    if (deliveredVolume !== undefined && shortageVolume === undefined) {
      updateData.shortageVolume = delivery.loadedVolume - deliveredVolume;
    } else if (shortageVolume !== undefined) {
      updateData.shortageVolume = shortageVolume;
    }

    if (grossTruckFee !== undefined) {
      updateData.grossTruckFee = grossTruckFee;
    } else if (deliveredVolume !== undefined && !grossTruckFee) {
      // Auto-calculate grossTruckFee if deliveredVolume is updated
      updateData.grossTruckFee = deliveredVolume * delivery.transportRate;
    }

    if (shortageDeduction !== undefined) {
      updateData.shortageDeduction = shortageDeduction;
    } else if (updateData.shortageVolume !== undefined && !shortageDeduction) {
      // Auto-calculate shortageDeduction if shortageVolume is updated
      updateData.shortageDeduction = updateData.shortageVolume * delivery.aggregateValue;
    }

    if (netTruckPayment !== undefined) {
      updateData.netTruckPayment = netTruckPayment;
    } else if (updateData.grossTruckFee !== undefined && updateData.shortageDeduction !== undefined) {
      // Auto-calculate netTruckPayment
      updateData.netTruckPayment = updateData.grossTruckFee - updateData.shortageDeduction;
    }

    const updatedDelivery = await prisma.aggregateDelivery.update({
      where: { id: params.id },
      data: updateData,
      include: {
        transporter: true,
        truck: true,
      },
    });

    // Resolve customer and supplier names
    const [customerData, supplierData, item] = await Promise.all([
      prisma.customer.findUnique({
        where: { id: updatedDelivery.customerId },
        select: { id: true, companyName: true, code: true },
      }),
      prisma.supplier.findUnique({
        where: { id: updatedDelivery.supplierId },
        select: { id: true, companyName: true, code: true },
      }),
      prisma.item.findUnique({
        where: { id: updatedDelivery.itemId },
        select: { id: true, name: true, code: true, unit: true },
      }),
    ]);

    const data = {
      ...updatedDelivery,
      customer: customerData,
      supplier: supplierData,
      item,
    };

    // Send Telegram notification based on status change
    if (status === 'Delivered') {
      const shortageVol = updatedDelivery.shortageVolume || 0;
      const hasShortage = shortageVol > 0;
      notify({
        module: 'AGGREGATE',
        event: hasShortage ? 'aggregate_delivery_shortage' : 'aggregate_delivery',
        details: {
          dispatchNo: updatedDelivery.dispatchNo,
          customer: customerData?.companyName || 'Unknown',
          loadedVolume: `${updatedDelivery.loadedVolume} m³`,
          deliveredVolume: `${updatedDelivery.deliveredVolume} m³`,
          ...(hasShortage ? {
            shortageVolume: `${shortageVol.toFixed(2)} m³`,
            shortageDeduction: `ETB ${(updatedDelivery.shortageDeduction || 0).toLocaleString('en-US')}`,
          } : {}),
          truck: updatedDelivery.truck?.plateNo || 'N/A',
        },
      });
    } else if (status === 'Verified') {
      notify({
        module: 'AGGREGATE',
        event: 'aggregate_verified',
        details: {
          dispatchNo: updatedDelivery.dispatchNo,
          customer: customerData?.companyName || 'Unknown',
          deliveredVolume: `${updatedDelivery.deliveredVolume} m³`,
          netPayment: `ETB ${(updatedDelivery.netTruckPayment || 0).toLocaleString('en-US')}`,
        },
      });
    } else if (status === 'Settled') {
      notify({
        module: 'AGGREGATE',
        event: 'aggregate_settled',
        details: {
          dispatchNo: updatedDelivery.dispatchNo,
          customer: customerData?.companyName || 'Unknown',
          netPayment: `ETB ${(updatedDelivery.netTruckPayment || 0).toLocaleString('en-US')}`,
        },
      });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error updating aggregate delivery status:', error);
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
    const searchParams = request.nextUrl.searchParams;
    const isPermanent = searchParams.get('permanent') === 'true' || searchParams.get('hard') === 'true';

    const delivery = await prisma.aggregateDelivery.findUnique({
      where: { id: params.id },
    });

    if (!delivery) {
      return NextResponse.json(
        { success: false, error: 'Aggregate delivery not found' },
        { status: 404 }
      );
    }

    if (isPermanent) {
      // Hard delete from database
      await prisma.aggregateDelivery.delete({
        where: { id: params.id },
      });

      return NextResponse.json({
        success: true,
        message: 'Aggregate delivery permanently deleted',
      });
    }

    // Default: Soft delete by setting status to 'Cancelled'
    const deletedDelivery = await prisma.aggregateDelivery.update({
      where: { id: params.id },
      data: { status: 'Cancelled' },
      include: {
        transporter: true,
        truck: true,
      },
    });

    // Resolve customer and supplier names
    const [customerData, supplierData, item] = await Promise.all([
      prisma.customer.findUnique({
        where: { id: deletedDelivery.customerId },
        select: { id: true, companyName: true, code: true },
      }),
      prisma.supplier.findUnique({
        where: { id: deletedDelivery.supplierId },
        select: { id: true, companyName: true, code: true },
      }),
      prisma.item.findUnique({
        where: { id: deletedDelivery.itemId },
        select: { id: true, name: true, code: true, unit: true },
      }),
    ]);

    const data = {
      ...deletedDelivery,
      customer: customerData,
      supplier: supplierData,
      item,
    };

    return NextResponse.json({ success: true, message: 'Aggregate delivery cancelled successfully', data });
  } catch (error: any) {
    console.error('Error deleting aggregate delivery:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
