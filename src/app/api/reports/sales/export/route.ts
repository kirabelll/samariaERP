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
          cementLifting: { select: { id: true, liftingNo: true, padNumber: true, podNumber: true } },
        },
      });

      const invoicedLiftingIds = new Set<string>();
      const invoicedLiftingNos = new Set<string>();
      const invoicedDeliveryIds = new Set<string>();
      const invoicedDispatchNos = new Set<string>();
      const invoicedPadPodNos = new Set<string>();
      const invoicedGeneralIds = new Set<string>();
      const invoicedGeneralNos = new Set<string>();
      const textCorpusParts: string[] = [];

      allActiveInvoices.forEach((inv) => {
        if (inv.liftingId) {
          const lid = String(inv.liftingId).trim().toLowerCase();
          invoicedLiftingIds.add(lid);
          invoicedGeneralIds.add(lid);
        }
        if (inv.cementLifting?.liftingNo) {
          const lno = String(inv.cementLifting.liftingNo).trim().toLowerCase();
          invoicedLiftingNos.add(lno);
          invoicedGeneralNos.add(lno);
          if (inv.cementLifting.id) {
            const cid = String(inv.cementLifting.id).trim().toLowerCase();
            invoicedLiftingIds.add(cid);
            invoicedGeneralIds.add(cid);
          }
          if (inv.cementLifting.padNumber) {
            const pno = String(inv.cementLifting.padNumber).trim().toLowerCase();
            invoicedPadPodNos.add(pno);
            invoicedLiftingNos.add(pno);
            invoicedGeneralNos.add(pno);
          }
          if (inv.cementLifting.podNumber) {
            const pno = String(inv.cementLifting.podNumber).trim().toLowerCase();
            invoicedPadPodNos.add(pno);
            invoicedLiftingNos.add(pno);
            invoicedGeneralNos.add(pno);
          }
        }

        if (typeof inv.items === 'string') {
          textCorpusParts.push(inv.items.toLowerCase());
        }

        const parsedItems = safelyParseItems(inv.items);
        parsedItems.forEach((item: any) => {
          if (item.id) {
            const idStr = String(item.id).trim().toLowerCase();
            invoicedGeneralIds.add(idStr);
          }
          if (item.liftingId) {
            const idStr = String(item.liftingId).trim().toLowerCase();
            invoicedLiftingIds.add(idStr);
            invoicedGeneralIds.add(idStr);
          }
          if (item.liftingIds && Array.isArray(item.liftingIds)) {
            item.liftingIds.forEach((id: any) => {
              if (id) {
                const idStr = String(id).trim().toLowerCase();
                invoicedLiftingIds.add(idStr);
                invoicedGeneralIds.add(idStr);
              }
            });
          }
          if (item.deliveryId) {
            const idStr = String(item.deliveryId).trim().toLowerCase();
            invoicedDeliveryIds.add(idStr);
            invoicedGeneralIds.add(idStr);
          }
          if (item.deliveryIds && Array.isArray(item.deliveryIds)) {
            item.deliveryIds.forEach((id: any) => {
              if (id) {
                const idStr = String(id).trim().toLowerCase();
                invoicedDeliveryIds.add(idStr);
                invoicedGeneralIds.add(idStr);
              }
            });
          }
          if (item.dispatchId) {
            const idStr = String(item.dispatchId).trim().toLowerCase();
            invoicedDeliveryIds.add(idStr);
            invoicedGeneralIds.add(idStr);
          }
          if (item.dispatchIds && Array.isArray(item.dispatchIds)) {
            item.dispatchIds.forEach((id: any) => {
              if (id) {
                const idStr = String(id).trim().toLowerCase();
                invoicedDeliveryIds.add(idStr);
                invoicedGeneralIds.add(idStr);
              }
            });
          }

          if (item.liftingNo) {
            const noStr = String(item.liftingNo).trim().toLowerCase();
            invoicedLiftingNos.add(noStr);
            invoicedGeneralNos.add(noStr);
          }
          if (item.liftingNos && Array.isArray(item.liftingNos)) {
            item.liftingNos.forEach((no: any) => {
              if (no) {
                const noStr = String(no).trim().toLowerCase();
                invoicedLiftingNos.add(noStr);
                invoicedGeneralNos.add(noStr);
              }
            });
          }
          if (item.dispatchNo) {
            const noStr = String(item.dispatchNo).trim().toLowerCase();
            invoicedDispatchNos.add(noStr);
            invoicedGeneralNos.add(noStr);
          }
          if (item.dispatchNos && Array.isArray(item.dispatchNos)) {
            item.dispatchNos.forEach((no: any) => {
              if (no) {
                const noStr = String(no).trim().toLowerCase();
                invoicedDispatchNos.add(noStr);
                invoicedGeneralNos.add(noStr);
              }
            });
          }
          if (item.padNumber) {
            const pad = String(item.padNumber).trim().toLowerCase();
            invoicedPadPodNos.add(pad);
            invoicedLiftingNos.add(pad);
            invoicedDispatchNos.add(pad);
            invoicedGeneralNos.add(pad);
          }
          if (item.padNumbers && Array.isArray(item.padNumbers)) {
            item.padNumbers.forEach((p: any) => {
              if (p) {
                const pad = String(p).trim().toLowerCase();
                invoicedPadPodNos.add(pad);
                invoicedLiftingNos.add(pad);
                invoicedDispatchNos.add(pad);
                invoicedGeneralNos.add(pad);
              }
            });
          }
          if (item.podNumber) {
            const pod = String(item.podNumber).trim().toLowerCase();
            invoicedPadPodNos.add(pod);
            invoicedLiftingNos.add(pod);
            invoicedDispatchNos.add(pod);
            invoicedGeneralNos.add(pod);
          }
          if (item.podNumbers && Array.isArray(item.podNumbers)) {
            item.podNumbers.forEach((p: any) => {
              if (p) {
                const pod = String(p).trim().toLowerCase();
                invoicedPadPodNos.add(pod);
                invoicedLiftingNos.add(pod);
                invoicedDispatchNos.add(pod);
                invoicedGeneralNos.add(pod);
              }
            });
          }

          if (item.ref) {
            const ref = String(item.ref).trim().toLowerCase();
            invoicedGeneralNos.add(ref);
          }
          if (item.refs && Array.isArray(item.refs)) {
            item.refs.forEach((r: any) => {
              if (r) invoicedGeneralNos.add(String(r).trim().toLowerCase());
            });
          }

          const text = `${item.item || ''} ${item.name || ''} ${item.description || ''} ${item.itemName || ''}`;
          textCorpusParts.push(text.toLowerCase());
          
          const lftMatches = text.match(/(?:LIFT|LFT)-[\w-]+/gi);
          if (lftMatches) {
            lftMatches.forEach((m) => {
              const clean = m.trim().toLowerCase();
              invoicedLiftingNos.add(clean);
              invoicedGeneralNos.add(clean);
            });
          }

          const dispMatches = text.match(/(?:DISP|DSP|AGG)-[\w-]+/gi);
          if (dispMatches) {
            dispMatches.forEach((m) => {
              const clean = m.trim().toLowerCase();
              invoicedDispatchNos.add(clean);
              invoicedGeneralNos.add(clean);
            });
          }

          const podMatches = text.match(/(?:POD|PAD)s?\s*#?\s*([\w/-]+)/gi);
          if (podMatches) {
            podMatches.forEach((matchStr) => {
              const cleaned = matchStr.replace(/^(?:POD|PAD)s?\s*#?/i, '').trim().toLowerCase();
              if (cleaned) {
                invoicedPadPodNos.add(cleaned);
                invoicedLiftingNos.add(cleaned);
                invoicedDispatchNos.add(cleaned);
                invoicedGeneralNos.add(cleaned);
              }
            });
          }
        });
      });

      const allInvoicesTextCorpus = textCorpusParts.join(' ');

      const isLiftingInvoiced = (l: any): boolean => {
        if (Array.isArray(l.invoices) && l.invoices.some((inv: any) => inv.status !== 'Cancelled' && inv.status !== 'Inactive')) {
          return true;
        }
        const idStr = String(l.id || '').trim().toLowerCase();
        if (idStr && (invoicedLiftingIds.has(idStr) || invoicedGeneralIds.has(idStr))) {
          return true;
        }
        const lNo = String(l.liftingNo || '').trim().toLowerCase();
        if (lNo && (invoicedLiftingNos.has(lNo) || invoicedGeneralNos.has(lNo))) {
          return true;
        }
        const padStr = String(l.padNumber || '').trim().toLowerCase();
        if (padStr && (invoicedPadPodNos.has(padStr) || invoicedLiftingNos.has(padStr) || invoicedGeneralNos.has(padStr))) {
          return true;
        }
        const podStr = String(l.podNumber || '').trim().toLowerCase();
        if (podStr && (invoicedPadPodNos.has(podStr) || invoicedLiftingNos.has(podStr) || invoicedGeneralNos.has(podStr))) {
          return true;
        }
        const delNote = String(l.deliveryNoteNo || '').trim().toLowerCase();
        if (delNote && (invoicedGeneralNos.has(delNote) || invoicedLiftingNos.has(delNote))) {
          return true;
        }
        if (lNo && allInvoicesTextCorpus.includes(lNo)) {
          return true;
        }
        if (idStr && allInvoicesTextCorpus.includes(idStr)) {
          return true;
        }
        if (padStr && padStr.length >= 3 && allInvoicesTextCorpus.includes(padStr)) {
          return true;
        }
        if (podStr && podStr.length >= 3 && allInvoicesTextCorpus.includes(podStr)) {
          return true;
        }
        return false;
      };

      const isDispatchInvoiced = (d: any): boolean => {
        const idStr = String(d.id || '').trim().toLowerCase();
        if (idStr && (invoicedDeliveryIds.has(idStr) || invoicedGeneralIds.has(idStr))) {
          return true;
        }
        const dNo = String(d.dispatchNo || '').trim().toLowerCase();
        if (dNo && (invoicedDispatchNos.has(dNo) || invoicedGeneralNos.has(dNo))) {
          return true;
        }
        const padStr = String(d.padNumber || '').trim().toLowerCase();
        if (padStr && (invoicedPadPodNos.has(padStr) || invoicedDispatchNos.has(padStr) || invoicedGeneralNos.has(padStr))) {
          return true;
        }
        const podStr = String((d as any).podNumber || '').trim().toLowerCase();
        if (podStr && (invoicedPadPodNos.has(podStr) || invoicedDispatchNos.has(podStr) || invoicedGeneralNos.has(podStr))) {
          return true;
        }
        if (dNo && allInvoicesTextCorpus.includes(dNo)) {
          return true;
        }
        if (idStr && allInvoicesTextCorpus.includes(idStr)) {
          return true;
        }
        if (padStr && padStr.length >= 3 && allInvoicesTextCorpus.includes(padStr)) {
          return true;
        }
        if (podStr && podStr.length >= 3 && allInvoicesTextCorpus.includes(podStr)) {
          return true;
        }
        return false;
      };

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

      // Fetch customer agreements for liftings to resolve exact customer price per Quintal
      const liftingCustomerIds = Array.from(new Set(cementLiftings.map((l) => l.customerId).filter(Boolean)));
      const customerAgreements = liftingCustomerIds.length > 0
        ? await prisma.salesAgreement.findMany({
            where: { customerId: { in: liftingCustomerIds }, status: { notIn: ['Void', 'Cancelled'] } },
            select: { customerId: true, agreementNo: true, items: true, division: true, validFrom: true, validTo: true },
            orderBy: { createdAt: 'desc' },
          })
        : [];

      const resolveCustomerAgreementPrice = (customerId?: string, cementType?: string, liftingDate?: any): number => {
        if (!customerId) return 0;
        const agreements = customerAgreements.filter((a) => a.customerId === customerId);
        const lDate = liftingDate ? new Date(liftingDate) : null;
        const validDateAgreements = lDate
          ? agreements.filter((a) => {
              const from = a.validFrom ? new Date(a.validFrom) : null;
              const to = a.validTo ? new Date(a.validTo) : null;
              return (!from || from <= lDate) && (!to || to >= lDate);
            })
          : [];
        const targetAgreements = validDateAgreements.length > 0 ? validDateAgreements : agreements;
        for (const agr of targetAgreements) {
          try {
            const parsed = typeof agr.items === 'string' ? JSON.parse(agr.items) : (agr.items as any[] || []);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const targetType = (cementType || '').toUpperCase().trim();
              const matched = targetType
                ? parsed.find((item: any) => {
                    const rawName = (item.itemName || item.name || item.description || '').toUpperCase();
                    const rawType = (item.cementType || item.type || '').toUpperCase();
                    return (
                      (rawType && (rawType === targetType || targetType.includes(rawType) || rawType.includes(targetType))) ||
                      (rawName && (rawName.includes(targetType) || targetType.includes(rawName)))
                    );
                  }) || parsed[0]
                : parsed[0];
              if (matched) {
                const price = Number(matched.unitPrice ?? matched.pricePerUnit ?? matched.price ?? matched.amount ?? 0);
                if (price > 0) return price;
              }
            }
          } catch {}
        }
        return 0;
      };

      const uninvoicedCementItems = cementLiftings
        .filter((l) => !isLiftingInvoiced(l))
        .map((l) => {
          const rawWeight = Number(l.buyerWeighbridgeQty || l.factoryWeight || 0);
          const weightInQuintals = rawWeight > 1000 ? rawWeight / 100 : rawWeight;
          const agreedPrice = resolveCustomerAgreementPrice(l.customer?.id, l.purchase?.cementType, l.liftingDate);
          const unitPrice = agreedPrice > 0 ? agreedPrice : Number(l.purchase?.unitPrice || 0);
          const estValue = Math.round(weightInQuintals * unitPrice * 100) / 100;
          return {
            type: 'Cement Lifting',
            division: 'CEMENT',
            referenceNo: l.liftingNo,
            customer: l.customer?.companyName || 'Unknown',
            customerCode: l.customer?.code || '',
            source: l.factory?.name || 'Factory',
            quantity: weightInQuintals,
            unit: 'Quintal',
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
            status: { in: ['Delivered', 'Verified', 'Settled', 'Dispatched'] },
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
          .filter((d) => !isDispatchInvoiced(d))
          .map((d) => {
            const volume = Number(d.deliveredVolume || d.loadedVolume || 0);
            let customerPrice = 0;
            if (d.registeredBy && typeof d.registeredBy === 'string' && d.registeredBy.startsWith('{')) {
              try {
                const meta = JSON.parse(d.registeredBy);
                if (meta.customerPrice && Number(meta.customerPrice) > 0) {
                  customerPrice = Number(meta.customerPrice);
                }
              } catch {}
            }
            const unitPrice = customerPrice > 0 ? customerPrice : Number(d.aggregateValue || d.transportRate || 0);
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
