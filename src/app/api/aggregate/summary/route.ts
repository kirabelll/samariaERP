import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

interface CustomerReceivables {
  customerId: string;
  customerName: string;
  itemId: string;
  itemName: string;
  totalDeliveredVolume: number;
  aggregateValue: number;
  totalReceivable: number;
}

interface SupplierPayables {
  supplierId: string;
  supplierName: string;
  itemId: string;
  itemName: string;
  totalVolume: number;
  aggregateValue: number;
  totalPayable: number;
}

interface TransporterPayments {
  transporterId: string;
  transporterName: string;
  totalNetPayment: number;
  truckCount: number;
}

interface DailyReportRow {
  date: string;
  totalDeliveries: number;
  totalSalesValue: number;
  totalTransportCosts: number;
  totalShortageDeductions: number;
}

interface SummaryData {
  customerReceivables: CustomerReceivables[];
  totalCustomerReceivables: number;
  supplierPayables: SupplierPayables[];
  totalSupplierPayables: number;
  transporterPayments: TransporterPayments[];
  totalTransportPayable: number;
  dailyReports: DailyReportRow[];
  metrics: {
    totalDeliveries: number;
    totalSalesValue: number;
    totalTransportCosts: number;
    totalShortageDeductions: number;
    netProfit: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDateStr = searchParams.get('startDate') || '';
    const endDateStr = searchParams.get('endDate') || '';

    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (startDateStr) {
      startDate = new Date(startDateStr);
      startDate.setHours(0, 0, 0, 0);
    }
    if (endDateStr) {
      endDate = new Date(endDateStr);
      endDate.setHours(23, 59, 59, 999);
    }

    const whereClause: any = {};
    if (startDate || endDate) {
      whereClause.dispatchDate = {};
      if (startDate) {
        whereClause.dispatchDate.gte = startDate;
      }
      if (endDate) {
        whereClause.dispatchDate.lte = endDate;
      }
    }

    // Fetch all matching records
    const aggregateDeliveries = await prisma.aggregateDelivery.findMany({
      where: whereClause,
      include: {
        transporter: true,
      },
    });

    // Get unique customer, supplier, item, and transporter IDs
    const uniqueCustomerIds = Array.from(new Set(aggregateDeliveries.map((d) => d.customerId).filter(Boolean))) as string[];
    const uniqueSupplierIds = Array.from(new Set(aggregateDeliveries.map((d) => d.supplierId).filter(Boolean))) as string[];
    const uniqueItemIds = Array.from(new Set(aggregateDeliveries.map((d) => d.itemId).filter(Boolean))) as string[];
    const uniqueTransporterIds = Array.from(new Set(aggregateDeliveries.map((d) => d.transporterId).filter(Boolean))) as string[];

    // Fetch customer, supplier, item, and transporter details
    const [customers, suppliers, itemsList, transporters] = await Promise.all([
      uniqueCustomerIds.length > 0
        ? prisma.customer.findMany({
            where: { id: { in: uniqueCustomerIds } },
            select: { id: true, companyName: true, code: true },
          })
        : [],
      uniqueSupplierIds.length > 0
        ? prisma.supplier.findMany({
            where: { id: { in: uniqueSupplierIds } },
            select: { id: true, companyName: true, code: true },
          })
        : [],
      uniqueItemIds.length > 0
        ? prisma.item.findMany({
            where: { id: { in: uniqueItemIds } },
            select: { id: true, name: true, code: true },
          })
        : [],
      uniqueTransporterIds.length > 0
        ? prisma.transporter.findMany({
            where: { id: { in: uniqueTransporterIds } },
            select: { id: true, companyName: true },
          })
        : [],
    ]);

    const customerMap = Object.fromEntries(
      customers.map((c) => [c.id, { name: c.companyName, code: c.code }])
    );
    const supplierMap = Object.fromEntries(
      suppliers.map((s) => [s.id, { name: s.companyName, code: s.code }])
    );
    const itemMap = Object.fromEntries(
      itemsList.map((i) => [i.id, { name: i.name, code: i.code }])
    );
    const transporterMap = Object.fromEntries(transporters.map((t) => [t.id, t.companyName]));

    // Fetch the LATEST customer sales agreement per customer to get the current unit price
    const customerAgreements = await prisma.salesAgreement.findMany({
      where: {
        customerId: { in: uniqueCustomerIds },
        status: { notIn: ['Void', 'Cancelled'] },
      },
      select: { customerId: true, items: true },
      orderBy: { createdAt: 'desc' },
    });

    // customerPriceMap: "customerId_itemId" → unitPrice INCLUDING 15% VAT (latest agreement per customer+item)
    const customerPriceMap = new Map<string, number>();
    for (const agr of customerAgreements) {
      try {
        const parsed = typeof agr.items === 'string' ? JSON.parse(agr.items) : (agr.items as any[] || []);
        if (Array.isArray(parsed)) {
          parsed.forEach((item: any) => {
            const targetId = item.itemId || item.id;
            if (targetId) {
              const priceKey = `${agr.customerId}_${targetId}`;
              if (!customerPriceMap.has(priceKey)) {
                let finalUnitPriceIncVat = 0;
                const qty = Number(item.qty || item.quantity || 1);
                const unitPrice = Number(item.unitPrice || item.pricePerUnit || 0);

                if (unitPrice > 0) {
                  if (item.vatIncluded === true || item.priceType === 'inclusive') {
                    finalUnitPriceIncVat = unitPrice;
                  } else {
                    // Adds 15% VAT for 'incl', 'excl', or default sales agreement items
                    finalUnitPriceIncVat = unitPrice * 1.15;
                  }
                } else if (item.totalAmount || item.amount || item.total) {
                  const total = Number(item.totalAmount || item.amount || item.total);
                  const basePrice = qty > 0 ? total / qty : total;
                  if (item.vatIncluded === true || item.priceType === 'inclusive') {
                    finalUnitPriceIncVat = basePrice;
                  } else {
                    finalUnitPriceIncVat = basePrice * 1.15;
                  }
                }

                if (finalUnitPriceIncVat > 0) {
                  customerPriceMap.set(priceKey, finalUnitPriceIncVat);
                }
              }
            }
          });
        }
      } catch { /* ignore */ }
    }

    // Calculate Customer Receivables — grouped by customer + item, using agreement price per item (Inc. VAT)
    const customerReceivablesMap = new Map<string, CustomerReceivables>();
    aggregateDeliveries.forEach((delivery) => {
      const custId = delivery.customerId;
      const itemId = delivery.itemId;
      const groupKey = `${custId}_${itemId}`;

      // Get the agreement price (Inc. VAT) for this specific customer + item combo
      const agreementPrice = customerPriceMap.get(groupKey) || (delivery.aggregateValue ? delivery.aggregateValue * 1.15 : 0);

      if (!customerReceivablesMap.has(groupKey)) {
        customerReceivablesMap.set(groupKey, {
          customerId: custId,
          customerName: customerMap[custId]?.name || 'Unknown',
          itemId: itemId,
          itemName: itemMap[itemId]?.name || 'Unknown',
          totalDeliveredVolume: 0,
          aggregateValue: agreementPrice, // Direct from sales agreement (Inc. VAT)
          totalReceivable: 0,
        });
      }
      const rec = customerReceivablesMap.get(groupKey)!;
      const deliveredVol = delivery.deliveredVolume || delivery.loadedVolume || 0;
      rec.totalDeliveredVolume += deliveredVol;
      rec.totalReceivable += deliveredVol * agreementPrice;
    });

    const customerReceivables = Array.from(customerReceivablesMap.values())
      .map((rec) => ({
        ...rec,
        aggregateValue: rec.totalDeliveredVolume > 0 ? rec.totalReceivable / rec.totalDeliveredVolume : rec.aggregateValue,
      }))
      .sort((a, b) => b.totalReceivable - a.totalReceivable);
    const totalCustomerReceivables = customerReceivables.reduce((sum, r) => sum + r.totalReceivable, 0);

    // Fetch the LATEST supplier agreement per supplier to get the current unit price
    // orderBy createdAt desc → first match per supplier = latest agreement
    const supplierAgreements = uniqueSupplierIds.length > 0
      ? await prisma.supplierAgreement.findMany({
          where: {
            supplierId: { in: uniqueSupplierIds },
            status: { notIn: ['Void', 'Cancelled'] },
          },
          select: { supplierId: true, items: true },
          orderBy: { createdAt: 'desc' },
        })
      : [];

    // supplierPriceMap: "supplierId_itemId" → unitPrice INCLUDING 15% VAT (latest agreement per supplier+item)
    const supplierPriceMap = new Map<string, number>();
    for (const agr of supplierAgreements) {
      try {
        const parsed = typeof agr.items === 'string' ? JSON.parse(agr.items) : (agr.items as any[] || []);
        if (Array.isArray(parsed)) {
          parsed.forEach((item: any) => {
            const targetId = item.itemId || item.id;
            if (targetId) {
              const priceKey = `${agr.supplierId}_${targetId}`;
              if (!supplierPriceMap.has(priceKey)) {
                let finalUnitPriceIncVat = 0;
                const qty = Number(item.qty || item.quantity || 1);
                const unitPrice = Number(item.unitPrice || item.pricePerUnit || 0);

                if (unitPrice > 0) {
                  if (item.vatIncluded === true || item.priceType === 'inclusive') {
                    finalUnitPriceIncVat = unitPrice;
                  } else {
                    finalUnitPriceIncVat = unitPrice * 1.15;
                  }
                } else if (item.totalAmount || item.amount || item.total) {
                  const total = Number(item.totalAmount || item.amount || item.total);
                  const basePrice = qty > 0 ? total / qty : total;
                  if (item.vatIncluded === true || item.priceType === 'inclusive') {
                    finalUnitPriceIncVat = basePrice;
                  } else {
                    finalUnitPriceIncVat = basePrice * 1.15;
                  }
                }

                if (finalUnitPriceIncVat > 0) {
                  supplierPriceMap.set(priceKey, finalUnitPriceIncVat);
                }
              }
            }
          });
        }
      } catch { /* ignore */ }
    }

    // Calculate Supplier Payables — grouped by supplier + item, using agreement price per item (Inc. VAT)
    const supplierPayablesMap = new Map<string, SupplierPayables>();
    aggregateDeliveries.forEach((delivery) => {
      const suppId = delivery.supplierId;
      const itemId = delivery.itemId;
      const groupKey = `${suppId}_${itemId}`;

      // Get the agreement price (Inc. VAT) for this specific supplier + item combo
      const agreementPrice = supplierPriceMap.get(groupKey) || (delivery.aggregateValue ? delivery.aggregateValue * 1.15 : 0);

      if (!supplierPayablesMap.has(groupKey)) {
        supplierPayablesMap.set(groupKey, {
          supplierId: suppId,
          supplierName: supplierMap[suppId]?.name || 'Unknown',
          itemId: itemId,
          itemName: itemMap[itemId]?.name || 'Unknown',
          totalVolume: 0,
          aggregateValue: agreementPrice, // Direct from agreement for this item (Inc. VAT)
          totalPayable: 0,
        });
      }
      const payable = supplierPayablesMap.get(groupKey)!;
      const loadedVol = delivery.loadedVolume || 0;
      payable.totalVolume += loadedVol;
      payable.totalPayable += loadedVol * agreementPrice;
    });

    const supplierPayables = Array.from(supplierPayablesMap.values())
      .map((p) => ({
        ...p,
        aggregateValue: p.totalVolume > 0 ? p.totalPayable / p.totalVolume : p.aggregateValue,
      }))
      .sort((a, b) => b.totalPayable - a.totalPayable);
    const totalSupplierPayables = supplierPayables.reduce((sum, p) => sum + p.totalPayable, 0);

    // Calculate Transporter/Truck Payments
    const transporterPaymentsMap = new Map<string, TransporterPayments>();
    aggregateDeliveries.forEach((delivery) => {
      const key = delivery.transporterId;
      if (!transporterPaymentsMap.has(key)) {
        transporterPaymentsMap.set(key, {
          transporterId: key,
          transporterName: transporterMap[key] || 'Unknown',
          totalNetPayment: 0,
          truckCount: 0,
        });
      }
      const payment = transporterPaymentsMap.get(key)!;
      payment.totalNetPayment += delivery.netTruckPayment || delivery.grossTruckFee || 0;
      payment.truckCount += 1;
    });

    const transporterPayments = Array.from(transporterPaymentsMap.values()).sort(
      (a, b) => b.totalNetPayment - a.totalNetPayment
    );
    const totalTransportPayable = transporterPayments.reduce((sum, t) => sum + t.totalNetPayment, 0);

    // Calculate Daily Report Summary (Inc. VAT)
    const dailyMap = new Map<string, DailyReportRow>();
    aggregateDeliveries.forEach((delivery) => {
      if (!delivery.dispatchDate) return;
      const dateStr = new Date(delivery.dispatchDate).toISOString().split('T')[0];
      if (!dailyMap.has(dateStr)) {
        dailyMap.set(dateStr, {
          date: dateStr,
          totalDeliveries: 0,
          totalSalesValue: 0,
          totalTransportCosts: 0,
          totalShortageDeductions: 0,
        });
      }
      const daily = dailyMap.get(dateStr)!;
      daily.totalDeliveries += 1;
      const deliveredVol = delivery.deliveredVolume || delivery.loadedVolume;
      const custKey = `${delivery.customerId}_${delivery.itemId}`;
      const unitPriceIncVat = customerPriceMap.get(custKey) || (delivery.aggregateValue ? delivery.aggregateValue * 1.15 : 0);
      daily.totalSalesValue += deliveredVol * unitPriceIncVat;
      daily.totalTransportCosts += delivery.grossTruckFee || 0;
      daily.totalShortageDeductions += delivery.shortageDeduction || 0;
    });

    const dailyReports = Array.from(dailyMap.values()).sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // Calculate overall metrics
    const totalDeliveries = aggregateDeliveries.length;
    const totalSalesValue = aggregateDeliveries.reduce((sum, d) => {
      const deliveredVol = d.deliveredVolume || d.loadedVolume;
      const custKey = `${d.customerId}_${d.itemId}`;
      const unitPriceIncVat = customerPriceMap.get(custKey) || (d.aggregateValue ? d.aggregateValue * 1.15 : 0);
      return sum + deliveredVol * unitPriceIncVat;
    }, 0);
    const totalTransportCosts = aggregateDeliveries.reduce((sum, d) => sum + (d.grossTruckFee || 0), 0);
    const totalShortageDeductions = aggregateDeliveries.reduce((sum, d) => sum + (d.shortageDeduction || 0), 0);
    const netProfit = totalSalesValue - totalSupplierPayables - totalTransportPayable;

    const data: SummaryData = {
      customerReceivables,
      totalCustomerReceivables,
      supplierPayables,
      totalSupplierPayables,
      transporterPayments,
      totalTransportPayable,
      dailyReports,
      metrics: {
        totalDeliveries,
        totalSalesValue,
        totalTransportCosts,
        totalShortageDeductions,
        netProfit,
      },
    };

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('Error fetching aggregate summary:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
