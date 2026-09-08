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

    const dispatchDate = new Date(delivery.dispatchDate);

    // Helper to check if a date falls between validFrom and validTo
    const isWithinPeriod = (validFrom: Date | string, validTo: Date | string, dateToTest: Date): boolean => {
      const from = new Date(validFrom);
      from.setHours(0, 0, 0, 0);
      const to = new Date(validTo);
      to.setHours(23, 59, 59, 999);
      const test = new Date(dateToTest);
      return test >= from && test <= to;
    };

    // Resolve customer, supplier, item, plus active agreements
    const [customer, supplier, item, allSalesAgreements, allSuppAgreements] = await Promise.all([
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
      prisma.salesAgreement.findMany({
        where: {
          customerId: delivery.customerId,
          status: { notIn: ['Void', 'Cancelled'] },
        },
        select: {
          id: true,
          agreementNo: true,
          status: true,
          validFrom: true,
          validTo: true,
          terms: true,
          offloadingSite: true,
          totalAmount: true,
          items: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.supplierAgreement.findMany({
        where: {
          supplierId: delivery.supplierId,
          status: { notIn: ['Void', 'Cancelled'] },
        },
        select: {
          id: true,
          agreementNo: true,
          status: true,
          validFrom: true,
          validTo: true,
          terms: true,
          loadingSite: true,
          offloadingSite: true,
          totalAmount: true,
          items: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Pick agreement where dispatchDate is within [validFrom, validTo]
    const validSalesAgr = allSalesAgreements.find((a) => isWithinPeriod(a.validFrom, a.validTo, dispatchDate));
    const salesAgr = validSalesAgr || allSalesAgreements[0] || null;
    const isCustomerDateValid = Boolean(validSalesAgr);

    const validSuppAgr = allSuppAgreements.find((a) => isWithinPeriod(a.validFrom, a.validTo, dispatchDate));
    const suppAgr = validSuppAgr || allSuppAgreements[0] || null;
    const isSupplierDateValid = Boolean(validSuppAgr);

    // Gather all item IDs from both agreements to resolve item names
    const allItemIds = new Set<string>();
    if (delivery.itemId) allItemIds.add(delivery.itemId);

    let rawSalesItems: any[] = [];
    if (salesAgr?.items) {
      try {
        rawSalesItems = typeof salesAgr.items === 'string' ? JSON.parse(salesAgr.items) : (salesAgr.items as any[] || []);
        rawSalesItems.forEach((i: any) => {
          if (i.itemId) allItemIds.add(i.itemId);
          if (i.id) allItemIds.add(i.id);
        });
      } catch {}
    }

    let rawSuppItems: any[] = [];
    if (suppAgr?.items) {
      try {
        rawSuppItems = typeof suppAgr.items === 'string' ? JSON.parse(suppAgr.items) : (suppAgr.items as any[] || []);
        rawSuppItems.forEach((i: any) => {
          if (i.itemId) allItemIds.add(i.itemId);
          if (i.id) allItemIds.add(i.id);
        });
      } catch {}
    }

    const itemsDb = await prisma.item.findMany({
      where: { id: { in: Array.from(allItemIds) } },
      select: { id: true, name: true, code: true, unit: true },
    });
    const itemsMap = new Map(itemsDb.map((it) => [it.id, it]));

    // Format parsed customer agreement items
    let matchedCustomerItem: any = null;
    const parsedCustomerItems = rawSalesItems.map((i: any) => {
      const itId = i.itemId || i.id;
      const dbIt = itemsMap.get(itId);
      const itemName = i.itemName || i.name || dbIt?.name || 'Aggregate Item';
      const itemCode = i.code || dbIt?.code || '';
      const unit = i.unit || dbIt?.unit || 'm³';
      const unitPrice = Number(i.unitPrice ?? i.pricePerUnit ?? i.price ?? 0);
      const qty = Number(i.qty ?? i.quantity ?? 1);
      const totalAmt = Number(i.totalAmount ?? i.amount ?? i.total ?? (qty * unitPrice));
      const isMatched = itId === delivery.itemId || itemName.toLowerCase() === item?.name.toLowerCase();

      const itemObj = {
        itemId: itId,
        itemName,
        itemCode,
        unit,
        unitPrice,
        qty,
        totalAmount: totalAmt,
        isMatched,
      };

      if (isMatched && !matchedCustomerItem) {
        matchedCustomerItem = itemObj;
      }
      return itemObj;
    });

    // Format parsed supplier agreement items
    let matchedSupplierItem: any = null;
    const parsedSupplierItems = rawSuppItems.map((i: any) => {
      const itId = i.itemId || i.id;
      const dbIt = itemsMap.get(itId);
      const itemName = i.itemName || i.name || dbIt?.name || 'Aggregate Item';
      const itemCode = i.code || dbIt?.code || '';
      const unit = i.unit || dbIt?.unit || 'm³';
      let unitPrice = Number(i.unitPrice ?? i.pricePerUnit ?? i.price ?? 0);
      const qty = Number(i.qty ?? i.quantity ?? 1);
      const totalAmt = Number(i.totalAmount ?? i.amount ?? i.total ?? (qty * unitPrice));

      if (unitPrice <= 0 && totalAmt > 0 && qty > 0) {
        if (i.priceType === 'incl' || i.vatIncluded === true || i.priceType === 'inclusive') {
          unitPrice = (totalAmt / 1.15) / qty;
        } else {
          unitPrice = totalAmt / qty;
        }
      }

      const isMatched = itId === delivery.itemId || itemName.toLowerCase() === item?.name.toLowerCase();

      const itemObj = {
        itemId: itId,
        itemName,
        itemCode,
        type: i.type || 'AGGREGATE',
        unit,
        unitPrice,
        qty,
        totalAmount: totalAmt,
        description: i.description || '',
        isMatched,
      };

      if (isMatched && !matchedSupplierItem) {
        matchedSupplierItem = itemObj;
      }
      return itemObj;
    });

    // 1. Resolve Supplier Price (from Supplier Agreement valid for dispatchDate or dispatch override)
    let supplierPrice = Number(delivery.aggregateValue || 0);
    if (isSupplierDateValid && matchedSupplierItem && matchedSupplierItem.unitPrice > 0) {
      supplierPrice = matchedSupplierItem.unitPrice;
    } else if (!isSupplierDateValid && matchedSupplierItem && matchedSupplierItem.unitPrice > 0 && supplierPrice <= 0) {
      supplierPrice = matchedSupplierItem.unitPrice;
    }
    if (Number(delivery.aggregateValue || 0) > 0) {
      supplierPrice = Number(delivery.aggregateValue);
    }

    // 2. Resolve Customer Price (from dispatch override in registeredBy or Customer Sales Agreement valid for dispatchDate)
    let customerPrice = 0;
    if (delivery.registeredBy && typeof delivery.registeredBy === 'string' && delivery.registeredBy.startsWith('{')) {
      try {
        const meta = JSON.parse(delivery.registeredBy);
        if (meta.customerPrice && Number(meta.customerPrice) > 0) {
          customerPrice = Number(meta.customerPrice);
        }
      } catch {}
    }

    if (customerPrice <= 0 && isCustomerDateValid && matchedCustomerItem && matchedCustomerItem.unitPrice > 0) {
      customerPrice = matchedCustomerItem.unitPrice;
    } else if (customerPrice <= 0 && matchedCustomerItem && matchedCustomerItem.unitPrice > 0) {
      customerPrice = matchedCustomerItem.unitPrice;
    }

    if (customerPrice <= 0) {
      customerPrice = supplierPrice;
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
      customerAgreement: salesAgr ? {
        id: salesAgr.id,
        agreementNo: salesAgr.agreementNo,
        status: salesAgr.status,
        validFrom: salesAgr.validFrom,
        validTo: salesAgr.validTo,
        offloadingSite: salesAgr.offloadingSite,
        terms: salesAgr.terms,
        totalAmount: salesAgr.totalAmount,
        isDateValid: isCustomerDateValid,
        items: parsedCustomerItems,
        matchedItem: matchedCustomerItem,
      } : null,
      supplierAgreement: suppAgr ? {
        id: suppAgr.id,
        agreementNo: suppAgr.agreementNo,
        status: suppAgr.status,
        validFrom: suppAgr.validFrom,
        validTo: suppAgr.validTo,
        loadingSite: suppAgr.loadingSite,
        offloadingSite: suppAgr.offloadingSite,
        terms: suppAgr.terms,
        totalAmount: suppAgr.totalAmount,
        isDateValid: isSupplierDateValid,
        items: parsedSupplierItems,
        matchedItem: matchedSupplierItem,
      } : null,
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

    // Supplier material rate (saved in aggregateValue)
    const supplierPrice = updateData.aggregateValue !== undefined && updateData.aggregateValue !== '' && !isNaN(parseFloat(updateData.aggregateValue))
      ? parseFloat(updateData.aggregateValue)
      : delivery.aggregateValue;

    // Customer selling rate (saved in registeredBy metadata)
    const customerPrice = updateData.customerPrice !== undefined && updateData.customerPrice !== '' && !isNaN(parseFloat(updateData.customerPrice))
      ? parseFloat(updateData.customerPrice)
      : null;

    let registeredByStr = updateData.registeredBy !== undefined ? updateData.registeredBy : delivery.registeredBy;
    let existingMeta: any = {};
    if (registeredByStr && typeof registeredByStr === 'string' && registeredByStr.startsWith('{')) {
      try { existingMeta = JSON.parse(registeredByStr); } catch {}
    } else if (registeredByStr) {
      existingMeta = { user: registeredByStr };
    }

    if (customerPrice !== null) {
      existingMeta.customerPrice = customerPrice;
      registeredByStr = JSON.stringify(existingMeta);
    }

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
      shortageDeduction = shortageVolume * supplierPrice;
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
      aggregateValue: supplierPrice,
      registeredBy: registeredByStr,
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
    if (updateData.dispatchDate !== undefined) {
      dataToSave.dispatchDate = updateData.dispatchDate ? new Date(updateData.dispatchDate) : delivery.dispatchDate;
    }
    if (updateData.deliveryDate !== undefined) {
      dataToSave.deliveryDate = updateData.deliveryDate ? new Date(updateData.deliveryDate) : null;
    }

    // Force update the aggregate delivery record with its own dispatch-specific customerPrice and supplierPrice
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

    const effectiveCustPrice = customerPrice !== null && customerPrice > 0 ? customerPrice : supplierPrice;
    const effectiveCustReceivable = loadedVolume * effectiveCustPrice;
    const effectiveSuppPayable = (deliveredVolume !== null ? deliveredVolume : loadedVolume) * supplierPrice;
    const effectiveNetAmount = effectiveCustReceivable - effectiveSuppPayable - grossTruckFee;

    const data = {
      ...updatedDelivery,
      customer: customerData,
      supplier: supplierData,
      item: itemData,
      customerPrice: effectiveCustPrice,
      supplierPrice,
      customerReceivable: effectiveCustReceivable,
      supplierPayable: effectiveSuppPayable,
      netAmount: effectiveNetAmount,
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
