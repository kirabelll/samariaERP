import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { toCSV, csvResponse } from '@/lib/csv-export';

export const dynamic = 'force-dynamic';

const safelyParseItems = (itemsRaw: any): any[] => {
  if (!itemsRaw) return [];
  let parsed = itemsRaw;
  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed);
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }
    } catch {
      return [];
    }
  }
  return Array.isArray(parsed) ? parsed : [];
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const exportType = searchParams.get('type') || 'invoiced'; // 'invoiced' | 'uninvoiced'
    const division = searchParams.get('division') || 'ALL';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const searchQuery = (searchParams.get('search') || '').trim().toLowerCase();
    const uninvoicedType = searchParams.get('uninvoicedType') || 'ALL'; // 'ALL' | 'CEMENT' | 'AGGREGATE'

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) {
      const endD = new Date(endDate);
      endD.setHours(23, 59, 59, 999);
      dateFilter.lte = endD;
    }

    if (exportType === 'invoiced') {
      const whereClause: any = {
        status: { notIn: ['Cancelled', 'Inactive'] },
      };
      if (startDate || endDate) whereClause.invoiceDate = dateFilter;
      if (division && division !== 'ALL') whereClause.division = division;

      const invoices = await prisma.salesInvoice.findMany({
        where: whereClause,
        include: {
          customer: { select: { companyName: true, code: true } },
          cementLifting: { select: { id: true, liftingNo: true, status: true } },
          payments: true,
        },
        orderBy: { invoiceDate: 'desc' },
        take: 10000,
      });

      const columns = [
        'Invoice No',
        'FS No',
        'Date',
        'Customer',
        'Customer Code',
        'Division',
        'Linked Shipment Refs',
        'Shipments Count',
        'Subtotal Amount (ETB)',
        'VAT Amount (ETB)',
        'Total Amount (ETB)',
        'Paid Amount (ETB)',
        'Outstanding Balance (ETB)',
        'Status',
      ];

      const rows = invoices
        .map((inv) => {
          const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
          const outstanding = Math.max(0, inv.totalAmount - paid);
          const deliveryRefsSet = new Set<string>();

          if (inv.cementLifting?.liftingNo) {
            deliveryRefsSet.add(inv.cementLifting.liftingNo);
          }

          const parsed = safelyParseItems(inv.items);
          if (parsed.length > 0) {
            parsed.forEach((item: any) => {
              if (item.liftingNo) deliveryRefsSet.add(String(item.liftingNo));
              if (item.liftingNos && Array.isArray(item.liftingNos)) {
                item.liftingNos.forEach((no: any) => deliveryRefsSet.add(String(no)));
              }
              if (item.dispatchNo) deliveryRefsSet.add(String(item.dispatchNo));
              if (item.dispatchNos && Array.isArray(item.dispatchNos)) {
                item.dispatchNos.forEach((no: any) => deliveryRefsSet.add(String(no)));
              }
              if (item.padNumber) deliveryRefsSet.add(String(item.padNumber));
              if (item.podNumber) deliveryRefsSet.add(String(item.podNumber));
              if (item.podNumbers && Array.isArray(item.podNumbers)) {
                item.podNumbers.forEach((p: any) => deliveryRefsSet.add(String(p)));
              }

              const text = `${item.item || ''} ${item.name || ''} ${item.description || ''} ${item.itemName || ''}`;
              const lftMatches = text.match(/(?:LIFT|LFT)-[\w-]+/gi);
              if (lftMatches) lftMatches.forEach((m) => deliveryRefsSet.add(m));
              const dispMatches = text.match(/(?:DISP|DSP|AGG)-[\w-]+/gi);
              if (dispMatches) dispMatches.forEach((m) => deliveryRefsSet.add(m));
            });
          }

          const deliveryRefs = Array.from(deliveryRefsSet);
          const customerName = inv.customer?.companyName || 'Unknown';
          const customerCode = inv.customer?.code || '';
          const refsStr = deliveryRefs.join(', ') || '-';
          const subtotal = Math.max(0, inv.totalAmount - (inv.vatAmount || 0));

          return {
            invoice: inv,
            customerName,
            customerCode,
            refsStr,
            deliveryRefs,
            subtotal,
            paid,
            outstanding,
          };
        })
        .filter((rec) => {
          if (!searchQuery) return true;
          const matchInv = rec.invoice.invoiceNo?.toLowerCase().includes(searchQuery);
          const matchFs = rec.invoice.fsNo?.toLowerCase().includes(searchQuery);
          const matchCust = rec.customerName.toLowerCase().includes(searchQuery);
          const matchCode = rec.customerCode.toLowerCase().includes(searchQuery);
          const matchRef = rec.refsStr.toLowerCase().includes(searchQuery);
          return matchInv || matchFs || matchCust || matchCode || matchRef;
        })
        .map((rec) => ({
          'Invoice No': rec.invoice.invoiceNo,
          'FS No': rec.invoice.fsNo || '-',
          'Date': rec.invoice.invoiceDate ? new Date(rec.invoice.invoiceDate).toLocaleDateString() : '-',
          'Customer': rec.customerName,
          'Customer Code': rec.customerCode || '-',
          'Division': rec.invoice.division,
          'Linked Shipment Refs': rec.refsStr,
          'Shipments Count': rec.deliveryRefs.length || (rec.refsStr !== '-' ? 1 : 0),
          'Subtotal Amount (ETB)': rec.subtotal.toFixed(2),
          'VAT Amount (ETB)': (rec.invoice.vatAmount || 0).toFixed(2),
          'Total Amount (ETB)': rec.invoice.totalAmount.toFixed(2),
          'Paid Amount (ETB)': rec.paid.toFixed(2),
          'Outstanding Balance (ETB)': rec.outstanding.toFixed(2),
          'Status': rec.invoice.status,
        }));

      const csv = toCSV(columns, rows);
      const filename = `invoiced-sales-${new Date().toISOString().split('T')[0]}.csv`;
      return csvResponse(csv, filename);
    } else if (exportType === 'uninvoiced') {
      // 1. Fetch active invoices to exclude already invoiced shipments
      const allActiveInvoices = await prisma.salesInvoice.findMany({
        where: { status: { notIn: ['Cancelled', 'Inactive'] } },
        select: {
          id: true,
          invoiceNo: true,
          liftingId: true,
          division: true,
          items: true,
          cementLifting: { select: { id: true, liftingNo: true } },
        },
      });

      const invoicedLiftingIds = new Set<string>();
      const invoicedLiftingNos = new Set<string>();
      const invoicedDeliveryIds = new Set<string>();
      const invoicedDispatchNos = new Set<string>();

      allActiveInvoices.forEach((inv) => {
        if (inv.liftingId) invoicedLiftingIds.add(String(inv.liftingId));
        if (inv.cementLifting?.liftingNo) {
          invoicedLiftingNos.add(String(inv.cementLifting.liftingNo));
          if (inv.cementLifting.id) invoicedLiftingIds.add(String(inv.cementLifting.id));
        }

        const parsedItems = safelyParseItems(inv.items);
        parsedItems.forEach((item: any) => {
          if (item.liftingId) invoicedLiftingIds.add(String(item.liftingId));
          if (item.liftingIds && Array.isArray(item.liftingIds)) {
            item.liftingIds.forEach((id: any) => invoicedLiftingIds.add(String(id)));
          }
          if (item.deliveryId) invoicedDeliveryIds.add(String(item.deliveryId));
          if (item.dispatchId) invoicedDeliveryIds.add(String(item.dispatchId));

          if (item.liftingNo) invoicedLiftingNos.add(String(item.liftingNo));
          if (item.liftingNos && Array.isArray(item.liftingNos)) {
            item.liftingNos.forEach((no: any) => invoicedLiftingNos.add(String(no)));
          }
          if (item.dispatchNo) invoicedDispatchNos.add(String(item.dispatchNo));
          if (item.dispatchNos && Array.isArray(item.dispatchNos)) {
            item.dispatchNos.forEach((no: any) => invoicedDispatchNos.add(String(no)));
          }
          if (item.padNumber) {
            invoicedLiftingNos.add(String(item.padNumber));
            invoicedDispatchNos.add(String(item.padNumber));
          }
          if (item.podNumber) {
            invoicedLiftingNos.add(String(item.podNumber));
            invoicedDispatchNos.add(String(item.podNumber));
          }
          if (item.podNumbers && Array.isArray(item.podNumbers)) {
            item.podNumbers.forEach((p: any) => {
              invoicedLiftingNos.add(String(p));
              invoicedDispatchNos.add(String(p));
            });
          }

          const text = `${item.item || ''} ${item.name || ''} ${item.description || ''} ${item.itemName || ''}`;
          const lftMatches = text.match(/(?:LIFT|LFT)-[\w-]+/gi);
          if (lftMatches) lftMatches.forEach((m) => invoicedLiftingNos.add(m));
          const dispMatches = text.match(/(?:DISP|DSP|AGG)-[\w-]+/gi);
          if (dispMatches) dispMatches.forEach((m) => invoicedDispatchNos.add(m));
        });
      });

      // Date filter for liftings and deliveries
      const liftingDateFilter: any = {};
      if (startDate) liftingDateFilter.gte = new Date(startDate);
      if (endDate) {
        const endD = new Date(endDate);
        endD.setHours(23, 59, 59, 999);
        liftingDateFilter.lte = endD;
      }

      // Fetch uninvoiced Cement Liftings
      const cementLiftings = (division === 'ALL' || division === 'CEMENT') && (uninvoicedType === 'ALL' || uninvoicedType === 'CEMENT')
        ? await prisma.cementLifting.findMany({
            where: {
              status: { in: ['Delivered', 'Verified', 'Lifted'] },
              ...(startDate || endDate ? { liftingDate: liftingDateFilter } : {}),
            },
            include: {
              customer: { select: { id: true, companyName: true, code: true } },
              factory: { select: { name: true } },
              purchase: { select: { unitPrice: true, cementType: true } },
              invoices: {
                where: { status: { notIn: ['Cancelled', 'Inactive'] } },
                select: { id: true, invoiceNo: true, status: true },
              },
            },
            orderBy: { liftingDate: 'desc' },
            take: 10000,
          })
        : [];

      const uninvoicedCementItems = cementLiftings
        .filter(
          (l) =>
            l.invoices.length === 0 &&
            !invoicedLiftingIds.has(String(l.id)) &&
            !invoicedLiftingNos.has(String(l.liftingNo))
        )
        .map((l) => {
          const weight = l.buyerWeighbridgeQty || l.factoryWeight || 0;
          const unitPrice = l.purchase?.unitPrice || 0;
          const estValue = Math.round(weight * unitPrice * 100) / 100;
          return {
            type: 'Cement Lifting',
            division: 'CEMENT',
            referenceNo: l.liftingNo,
            customer: l.customer?.companyName || 'Unknown',
            customerCode: l.customer?.code || '',
            source: l.factory?.name || 'Factory',
            quantity: weight,
            unit: 'Tons',
            unitPrice,
            estValue,
            deliveryDate: l.liftingDate ? new Date(l.liftingDate).toLocaleDateString() : '-',
            status: l.status,
          };
        });

      // Fetch uninvoiced Aggregate Deliveries
      let uninvoicedAggItems: any[] = [];
      if ((division === 'ALL' || division === 'AGGREGATE') && (uninvoicedType === 'ALL' || uninvoicedType === 'AGGREGATE')) {
        const aggregateDeliveries = await prisma.aggregateDelivery.findMany({
          where: {
            status: { in: ['Delivered', 'Verified', 'Settled'] },
            ...(startDate || endDate ? { dispatchDate: liftingDateFilter } : {}),
          },
          orderBy: { dispatchDate: 'desc' },
          take: 10000,
        });

        const aggCustIds = Array.from(new Set(aggregateDeliveries.map((d) => d.customerId)));
        const aggCustomers = await prisma.customer.findMany({
          where: { id: { in: aggCustIds } },
          select: { id: true, companyName: true, code: true },
        });
        const aggCustMap = new Map(aggCustomers.map((c) => [c.id, { name: c.companyName, code: c.code || '' }]));

        uninvoicedAggItems = aggregateDeliveries
          .filter(
            (d) =>
              !invoicedDeliveryIds.has(String(d.id)) &&
              !invoicedDispatchNos.has(String(d.dispatchNo))
          )
          .map((d) => {
            const volume = d.deliveredVolume || d.loadedVolume || 0;
            const unitPrice = d.aggregateValue || d.transportRate || 0;
            const estValue = Math.round(volume * unitPrice * 100) / 100;
            const cust = aggCustMap.get(d.customerId);
            return {
              type: 'Aggregate Delivery',
              division: 'AGGREGATE',
              referenceNo: d.dispatchNo,
              customer: cust?.name || 'Customer',
              customerCode: cust?.code || '',
              source: d.padNumber ? `Pad #${d.padNumber}` : `Site Dispatch`,
              quantity: volume,
              unit: 'm³',
              unitPrice,
              estValue,
              deliveryDate: d.deliveryDate || d.dispatchDate ? new Date(d.deliveryDate || d.dispatchDate).toLocaleDateString() : '-',
              status: d.status,
            };
          });
      }

      const allUninvoiced = [...uninvoicedCementItems, ...uninvoicedAggItems].filter((item) => {
        if (!searchQuery) return true;
        const matchRef = item.referenceNo?.toLowerCase().includes(searchQuery);
        const matchCust = item.customer?.toLowerCase().includes(searchQuery);
        const matchCode = item.customerCode?.toLowerCase().includes(searchQuery);
        const matchSource = item.source?.toLowerCase().includes(searchQuery);
        return matchRef || matchCust || matchCode || matchSource;
      });

      const columns = [
        'Type',
        'Division',
        'Lifting / Dispatch #',
        'Customer',
        'Customer Code',
        'Source / Factory',
        'Delivered Quantity',
        'Unit',
        'Unit Price (ETB)',
        'Estimated Value (ETB)',
        'Delivery Date',
        'Status',
      ];

      const rows = allUninvoiced.map((item) => ({
        'Type': item.type,
        'Division': item.division,
        'Lifting / Dispatch #': item.referenceNo,
        'Customer': item.customer,
        'Customer Code': item.customerCode || '-',
        'Source / Factory': item.source,
        'Delivered Quantity': item.quantity.toFixed(2),
        'Unit': item.unit,
        'Unit Price (ETB)': item.unitPrice.toFixed(2),
        'Estimated Value (ETB)': item.estValue.toFixed(2),
        'Delivery Date': item.deliveryDate,
        'Status': item.status,
      }));

      const csv = toCSV(columns, rows);
      const filename = `delivered-not-invoiced-${new Date().toISOString().split('T')[0]}.csv`;
      return csvResponse(csv, filename);
    } else {
      return new Response('Invalid export type', { status: 400 });
    }
  } catch (error: any) {
    console.error('Error exporting sales report:', error);
    return new Response(error.message, { status: 500 });
  }
}
