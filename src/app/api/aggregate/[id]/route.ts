import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notify } from '@/lib/telegram';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
        { status: 404, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    // Resolve customer and supplier names from their IDs, plus active agreement prices
    const [customer, supplier, item, salesAgr, suppAgr] = await Promise.all([
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
      prisma.salesAgreement.findFirst({
        where: {
          customerId: delivery.customerId,
          status: { notIn: ['Void', 'Cancelled'] },
        },
        select: { items: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.supplierAgreement.findFirst({
        where: {
          supplierId: delivery.supplierId,
          status: { notIn: ['Void', 'Cancelled'] },
        },
        select: { items: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    let customerPrice = Number(delivery.aggregateValue || 0);
    if (salesAgr?.items) {
      try {
        const parsed = typeof salesAgr.items === 'string' ? JSON.parse(salesAgr.items) : (salesAgr.items as any[] || []);
        const matched = parsed.find((i: any) => (i.itemId || i.id) === delivery.itemId);
        if (matched) {
          const unitPrice = Number(matched.unitPrice ?? matched.pricePerUnit ?? matched.amount ?? matched.totalAmount ?? 0);
          if (unitPrice > 0) {
            customerPrice = unitPrice;
          }
        }
      } catch { /* ignore */ }
    }

    let supplierPrice = delivery.aggregateValue;
    if (suppAgr?.items) {
      try {
        const parsed = typeof suppAgr.items === 'string' ? JSON.parse(suppAgr.items) : (suppAgr.items as any[] || []);
        const matched = parsed.find((i: any) => (i.itemId || i.id) === delivery.itemId);
        if (matched) {
          supplierPrice = matched.amount ?? matched.totalAmount ?? matched.unitPrice ?? supplierPrice;
        }
      } catch { /* ignore */ }
    }

    const loadedVol = delivery.loadedVolume || 0;
    const deliveredVol = delivery.deliveredVolume ?? delivery.loadedVolume ?? 0;
    const customerReceivable = loadedVol * customerPrice;
    const supplierPayable = deliveredVol * supplierPrice;
    const grossTruckFee = Number(delivery.grossTruckFee || 0);
    const netAmount = customerReceivable - supplierPayable - grossTruckFee;

    const data = {
      ...delivery,
      customer,
      supplier,
      item,
      customerPrice,
      supplierPrice,
      customerReceivable,
      supplierPayable,
      netAmount,
    };

    return NextResponse.json(
      { success: true, data },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (error: any) {
    console.error('Error fetching aggregate delivery:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
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
        { status: 404, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      );
    }

    const body = await request.json();

    // Safe destructuring - strip protected / relation object fields
    const { id, createdAt, updatedAt, transporter, truck, customer, supplier, item, ...updateData } = body;

    // Parse and sanitize volume and rate parameters
    const loadedVolume = updateData.loadedVolume !== undefined && updateData.loadedVolume !== '' && !isNaN(parseFloat(updateData.loadedVolume))
      ? parseFloat(updateData.loadedVolume)
      : delivery.loadedVolume;

    const deliveredVolume = updateData.deliveredVolume !== undefined
      ? (updateData.deliveredVolume !== null && updateData.deliveredVolume !== '' && !isNaN(parseFloat(updateData.deliveredVolume)) ? parseFloat(updateData.deliveredVolume) : null)
      : delivery.deliveredVolume;

    const transportRate = updateData.transportRate !== undefined && updateData.transportRate !== '' && !isNaN(parseFloat(updateData.transportRate))
      ? parseFloat(updateData.transportRate)
      : delivery.transportRate;

    const aggregateValue = updateData.aggregateValue !== undefined && updateData.aggregateValue !== '' && !isNaN(parseFloat(updateData.aggregateValue))
      ? parseFloat(updateData.aggregateValue)
      : delivery.aggregateValue;

    // Enforce mandatory Delivery Pad / Receipt Number when setting status to Verified
    if (updateData.status === 'Verified') {
      const effectivePadNumber = updateData.padNumber !== undefined ? updateData.padNumber : delivery.padNumber;
      if (!effectivePadNumber || !effectivePadNumber.trim()) {
        return NextResponse.json(
          { success: false, error: 'Cannot verify: Delivery Pad / Receipt Number is mandatory before verifying an aggregate dispatch.' },
          { status: 400, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
        );
      }
    }

    const truckIdToUse = updateData.truckId || delivery.truckId;
    let truckCapacity = 0;
    if (truckIdToUse) {
      const truckRec = await prisma.truck.findUnique({ where: { id: truckIdToUse } });
      if (truckRec?.capacity) truckCapacity = parseFloat(String(truckRec.capacity));
    }

    // Force recalculate all financial / fee values accurately
    const billableVolume = (truckCapacity > 0 && loadedVolume > truckCapacity) ? truckCapacity : loadedVolume;
    const grossTruckFee = billableVolume * transportRate;

    let shortageVolume: number | null = null;
    let shortageDeduction: number | null = null;
    if (deliveredVolume !== null && deliveredVolume !== undefined) {
      shortageVolume = Math.max(0, loadedVolume - deliveredVolume);
      shortageDeduction = shortageVolume * aggregateValue;
    }

    const netTruckPayment = grossTruckFee - (shortageDeduction || 0);

    const dataToSave: any = {
      customerId: updateData.customerId !== undefined ? updateData.customerId : delivery.customerId,
      supplierId: updateData.supplierId !== undefined ? updateData.supplierId : delivery.supplierId,
      transporterId: updateData.transporterId !== undefined ? updateData.transporterId : delivery.transporterId,
      truckId: truckIdToUse,
      itemId: updateData.itemId !== undefined ? updateData.itemId : delivery.itemId,
      driverName: updateData.driverName !== undefined ? (updateData.driverName || null) : delivery.driverName,
      padNumber: updateData.padNumber !== undefined ? (updateData.padNumber ? String(updateData.padNumber).trim() : null) : delivery.padNumber,
      loadedVolume,
      deliveredVolume,
      transportRate,
      aggregateValue,
      grossTruckFee,
      shortageVolume,
      shortageDeduction,
      netTruckPayment,
      status: updateData.status !== undefined ? updateData.status : delivery.status,
    };

    if (updateData.agreementId !== undefined) {
      dataToSave.agreementId = updateData.agreementId || null;
    }
    if (updateData.telegramProof !== undefined) {
      dataToSave.telegramProof = updateData.telegramProof || null;
    }
    if (updateData.signedInvoice !== undefined) {
      dataToSave.signedInvoice = updateData.signedInvoice || null;
    }
    if (updateData.verifiedBy !== undefined) {
      dataToSave.verifiedBy = updateData.verifiedBy || null;
    }
    if (updateData.registeredBy !== undefined) {
      dataToSave.registeredBy = updateData.registeredBy || null;
    }
    if (updateData.dispatchDate !== undefined) {
      dataToSave.dispatchDate = updateData.dispatchDate ? new Date(updateData.dispatchDate) : delivery.dispatchDate;
    }
    if (updateData.deliveryDate !== undefined) {
      dataToSave.deliveryDate = updateData.deliveryDate ? new Date(updateData.deliveryDate) : null;
    }

    // Force update the aggregate delivery record
    const updatedDelivery = await prisma.aggregateDelivery.update({
      where: { id: params.id },
      data: dataToSave,
      include: {
        transporter: true,
        truck: true,
      },
    });

    // If customer price was explicitly updated in the edit form, synchronize with active sales agreement
    if (updateData.customerPrice !== undefined && updateData.customerPrice !== null && updateData.customerPrice !== '') {
      const custPriceNum = parseFloat(updateData.customerPrice);
      if (!isNaN(custPriceNum) && custPriceNum > 0) {
        const activeSalesAgr = await prisma.salesAgreement.findFirst({
          where: {
            customerId: dataToSave.customerId,
            status: { notIn: ['Void', 'Cancelled'] },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (activeSalesAgr && activeSalesAgr.items) {
          try {
            const itemsList = typeof activeSalesAgr.items === 'string' ? JSON.parse(activeSalesAgr.items) : (activeSalesAgr.items as any[] || []);
            let changed = false;
            const updatedItems = itemsList.map((it: any) => {
              if ((it.itemId || it.id) === dataToSave.itemId) {
                changed = true;
                return { ...it, unitPrice: custPriceNum, pricePerUnit: custPriceNum };
              }
              return it;
            });
            if (changed) {
              await prisma.salesAgreement.update({
                where: { id: activeSalesAgr.id },
                data: { items: JSON.stringify(updatedItems) },
              });
            }
          } catch { /* ignore */ }
        }
      }
    }

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
      customerPrice: updateData.customerPrice !== undefined && !isNaN(parseFloat(updateData.customerPrice))
        ? parseFloat(updateData.customerPrice)
        : Number(updatedDelivery.aggregateValue || 0),
    };

    return NextResponse.json(
      { success: true, data },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
    );
  } catch (error: any) {
    console.error('Error updating aggregate delivery:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500, headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
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
      if (status === 'Verified') {
        const effectivePadNumber = padNumber !== undefined ? padNumber : delivery.padNumber;
        if (!effectivePadNumber || !effectivePadNumber.trim()) {
          return NextResponse.json(
            { success: false, error: 'Cannot verify: Delivery Pad / Receipt Number is mandatory before verifying an aggregate dispatch.' },
            { status: 400 }
          );
        }
      }
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
