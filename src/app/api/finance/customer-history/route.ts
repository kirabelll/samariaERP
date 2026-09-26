import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const statusFilter = searchParams.get('filter') || 'all'; // all, has_debt, paid_up

    // Get IDs of customers who have aggregate deliveries (no Prisma relation)
    const aggCustomerIds = await prisma.aggregateDelivery.findMany({
      where: { status: { in: ['Dispatched', 'Delivered', 'Verified', 'Settled'] } },
      select: { customerId: true },
      distinct: ['customerId'],
    });
    const aggCustIdSet = aggCustomerIds.map((d) => d.customerId);

    // Get all customers who have cement/agg invoices, cement liftings, or aggregate deliveries
    const customers = await prisma.customer.findMany({
      where: {
        OR: [
          { invoices: { some: { division: { in: ['CEMENT', 'CONSTRUCTION', 'AGGREGATE'] } } } },
          { cementLiftings: { some: { status: { in: ['Delivered', 'Verified'] } } } },
          ...(aggCustIdSet.length > 0 ? [{ id: { in: aggCustIdSet } }] : []),
        ],
        ...(search
          ? {
              AND: [
                {
                  OR: [
                    { companyName: { contains: search, mode: 'insensitive' } },
                    { code: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search, mode: 'insensitive' } },
                  ],
                },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        code: true,
        companyName: true,
        phone: true,
        tin: true,
        creditLimit: true,
        creditTermDays: true,
        invoices: {
          where: { division: { in: ['CEMENT', 'CONSTRUCTION', 'AGGREGATE'] }, status: { not: 'Cancelled' } },
          select: {
            id: true,
            invoiceNo: true,
            totalAmount: true,
            status: true,
            invoiceDate: true,
            dueDate: true,
            liftingId: true,
            payments: {
              where: { status: { not: 'Rejected' } },
              select: { amount: true, withholdingAmount: true },
            },
          },
          orderBy: { invoiceDate: 'asc' },
        },
        payments: {
          where: { status: { not: 'Rejected' } },
          select: {
            id: true,
            receiptNo: true,
            amount: true,
            status: true,
            paymentMethod: true,
            paymentDate: true,
            invoiceId: true,
          },
          orderBy: { paymentDate: 'asc' },
        },
        cementLiftings: {
          where: {
            status: { in: ['Delivered', 'Verified'] },
          },
          select: {
            id: true,
            liftingNo: true,
            factoryWeight: true,
            status: true,
            liftingDate: true,
            invoices: { select: { id: true } },
            purchase: { select: { unitPrice: true } },
          },
          orderBy: { liftingDate: 'asc' },
        },
      },
      orderBy: { companyName: 'asc' },
    });

    // Fetch aggregate deliveries for all customers (not in Prisma relation)
    const customerIds = customers.map((c) => c.id);
    const aggregateDeliveries = customerIds.length > 0
      ? await prisma.aggregateDelivery.findMany({
          where: {
            customerId: { in: customerIds },
            status: { in: ['Dispatched', 'Delivered', 'Verified', 'Settled'] },
          },
          select: {
            id: true,
            customerId: true,
            dispatchNo: true,
            loadedVolume: true,
            deliveredVolume: true,
            aggregateValue: true,
            status: true,
            dispatchDate: true,
          },
        })
      : [];

    // Get payment vouchers for all sales invoices to calculate paid amounts accurately
    const invoiceIds = customers.flatMap((c) => c.invoices.map((inv) => inv.id));
    const invoiceNos = customers.flatMap((c) => c.invoices.map((inv) => inv.invoiceNo));
    const voucherAggs = invoiceIds.length > 0
      ? await prisma.paymentVoucher.groupBy({
          by: ['sourceId', 'sourceRef'],
          where: {
            sourceModule: 'SALES',
            OR: [
              ...(invoiceIds.length > 0 ? [{ sourceId: { in: invoiceIds } }] : []),
              ...(invoiceNos.length > 0 ? [{ sourceRef: { in: invoiceNos } }] : []),
            ],
            status: { notIn: ['Cancelled', 'Rejected'] },
          },
          _sum: { amount: true },
        })
      : [];

    const voucherPaidMap = new Map<string, number>();
    voucherAggs.forEach((v) => {
      const amt = Number(v._sum.amount || 0);
      if (v.sourceId) voucherPaidMap.set(v.sourceId, (voucherPaidMap.get(v.sourceId) || 0) + amt);
      if (v.sourceRef) voucherPaidMap.set(v.sourceRef, (voucherPaidMap.get(v.sourceRef) || 0) + amt);
    });

    // Helper to safely parse JSON items
    const safelyParseItems = (itemsRaw: any): any[] => {
      if (!itemsRaw) return [];
      let parsed = itemsRaw;
      if (typeof parsed === 'string') {
        try {
          parsed = JSON.parse(parsed);
          if (typeof parsed === 'string') parsed = JSON.parse(parsed);
        } catch {
          return [];
        }
      }
      return Array.isArray(parsed) ? parsed : [];
    };

    // Extract all invoiced lifting and delivery references from all active invoices
    const allActiveInvoices = await prisma.salesInvoice.findMany({
      where: { status: { notIn: ['Cancelled', 'Inactive'] } },
      select: {
        id: true,
        invoiceNo: true,
        customerId: true,
        liftingId: true,
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

    // Group aggregate deliveries by customer
    const aggByCustomer = new Map<string, typeof aggregateDeliveries>();
    aggregateDeliveries.forEach((d) => {
      if (!aggByCustomer.has(d.customerId)) aggByCustomer.set(d.customerId, []);
      aggByCustomer.get(d.customerId)!.push(d);
    });

    // Compute summary for each customer
    const summaries = customers.map((c) => {
      const invoiceDetails = c.invoices.map((inv) => {
        const directPaid = (inv.payments || []).reduce(
          (sum: number, p: any) => sum + Number(p.amount || 0) + Number(p.withholdingAmount || 0),
          0
        );
        const voucherPaid = Math.max(
          voucherPaidMap.get(inv.id) || 0,
          voucherPaidMap.get(inv.invoiceNo) || 0
        );
        let paidAmount = Math.max(directPaid, voucherPaid);
        const totalAmount = Number(inv.totalAmount || 0);

        if (inv.status === 'Paid' && paidAmount < totalAmount) {
          paidAmount = totalAmount;
        }
        paidAmount = Math.min(paidAmount, totalAmount);

        let computedStatus = inv.status;
        if (paidAmount >= totalAmount && totalAmount > 0) {
          computedStatus = 'Paid';
          paidAmount = totalAmount;
        } else if (paidAmount > 0) {
          computedStatus = 'Partial';
        }

        return {
          id: inv.id,
          invoiceNo: inv.invoiceNo,
          totalAmount,
          paidAmount,
          remainingAmount: Math.max(0, totalAmount - paidAmount),
          status: computedStatus,
          invoiceDate: inv.invoiceDate,
          dueDate: inv.dueDate,
          liftingId: inv.liftingId,
        };
      }).sort((a, b) => new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime());

      const sortedPayments = [...c.payments].sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());

      const totalInvoiced = c.invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
      const invoiceCount = c.invoices.length;
      const unpaidInvoices = invoiceDetails.filter((inv) => inv.status === 'Unpaid').length;
      const partialInvoices = invoiceDetails.filter((inv) => inv.status === 'Partial').length;
      const paidInvoices = invoiceDetails.filter((inv) => inv.status === 'Paid').length;

      // Payments: count verified customer payments OR total paid amounts across customer invoices (whichever is higher)
      const directVerifiedPayments = c.payments
        .filter((p) => p.status === 'Verified')
        .reduce((sum, p) => sum + Number(p.amount), 0);
      const totalInvoicePaid = invoiceDetails.reduce((sum, inv) => sum + inv.paidAmount, 0);
      const totalPaid = Math.max(totalInvoicePaid, directVerifiedPayments);

      const pendingPayments = c.payments
        .filter((p) => p.status === 'Pending')
        .reduce((sum, p) => sum + Number(p.amount), 0);
      const paymentCount = c.payments.length;

      // Delivered/Verified liftings that have no invoice yet
      const uninvoicedLiftings = c.cementLiftings.filter((l) => !isLiftingInvoiced(l));
      const cementDeliveredNotInvoiced = uninvoicedLiftings.reduce(
        (sum, l) => sum + Number(l.factoryWeight) * Number(l.purchase.unitPrice),
        0
      );
      const cementDeliveredNotInvoicedCount = uninvoicedLiftings.length;

      // Aggregate deliveries that haven't been invoiced yet
      const customerAggDeliveries = aggByCustomer.get(c.id) || [];
      const uninvoicedAggDeliveries = customerAggDeliveries.filter((d) => !isDispatchInvoiced(d));
      const aggDeliveredNotInvoiced = uninvoicedAggDeliveries.reduce(
        (sum, d) => sum + (d.deliveredVolume || d.loadedVolume) * (d.aggregateValue || 0),
        0
      );
      const aggDeliveredNotInvoicedCount = uninvoicedAggDeliveries.length;

      const deliveredNotInvoiced = cementDeliveredNotInvoiced + aggDeliveredNotInvoiced;
      const deliveredNotInvoicedCount = cementDeliveredNotInvoicedCount + aggDeliveredNotInvoicedCount;

      const outstandingBalance = totalInvoiced - totalPaid;
      const totalOutstanding = outstandingBalance + deliveredNotInvoiced;

      // Oldest unpaid invoice
      const oldestUnpaid = invoiceDetails.filter((inv) => inv.status !== 'Paid' && inv.status !== 'Cancelled')
        .sort((a, b) => new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime())[0];

      const daysSinceOldest = oldestUnpaid
        ? Math.floor((Date.now() - new Date(oldestUnpaid.invoiceDate).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        id: c.id,
        code: c.code,
        companyName: c.companyName,
        phone: c.phone,
        tin: c.tin,
        creditLimit: c.creditLimit,
        creditTermDays: c.creditTermDays,
        totalInvoiced,
        totalPaid,
        pendingPayments,
        outstandingBalance,
        deliveredNotInvoiced,
        deliveredNotInvoicedCount,
        totalOutstanding,
        invoiceCount,
        unpaidInvoices,
        partialInvoices,
        paidInvoices,
        paymentCount,
        oldestUnpaidDate: oldestUnpaid?.invoiceDate || null,
        daysSinceOldest,
        recentInvoices: invoiceDetails.slice(0, 5),
        recentPayments: sortedPayments.slice(0, 5),
      };
    });

    // Apply status filter (using totalOutstanding which includes delivered-not-invoiced)
    let filtered = summaries;
    if (statusFilter === 'has_debt') {
      filtered = summaries.filter((s) => s.totalOutstanding > 0);
    } else if (statusFilter === 'paid_up') {
      filtered = summaries.filter((s) => s.totalOutstanding <= 0);
    }

    // Compute overall totals
    const totals = {
      totalCustomers: filtered.length,
      totalInvoiced: filtered.reduce((s, c) => s + c.totalInvoiced, 0),
      totalPaid: filtered.reduce((s, c) => s + c.totalPaid, 0),
      totalOutstanding: filtered.reduce((s, c) => s + c.totalOutstanding, 0),
      totalDeliveredNotInvoiced: filtered.reduce((s, c) => s + c.deliveredNotInvoiced, 0),
      totalPending: filtered.reduce((s, c) => s + c.pendingPayments, 0),
      customersWithDebt: filtered.filter((c) => c.totalOutstanding > 0).length,
    };

    return NextResponse.json({
      success: true,
      data: filtered,
      totals,
    });
  } catch (error: any) {
    console.error('Error fetching customer history:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
