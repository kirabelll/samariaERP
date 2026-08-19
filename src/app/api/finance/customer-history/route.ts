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
          orderBy: { invoiceDate: 'desc' },
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
          orderBy: { paymentDate: 'desc' },
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
          orderBy: { liftingDate: 'desc' },
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

    // Get already-invoiced aggregate delivery IDs from existing invoices
    const aggInvoices = await prisma.salesInvoice.findMany({
      where: { division: 'AGGREGATE', status: { not: 'Cancelled' } },
      select: { items: true },
    });
    const invoicedAggDeliveryIds = new Set<string>();
    for (const inv of aggInvoices) {
      try {
        const parsed = typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items;
        if (Array.isArray(parsed)) {
          parsed.forEach((item: any) => {
            if (item.deliveryId) invoicedAggDeliveryIds.add(item.deliveryId);
          });
        }
      } catch { /* ignore */ }
    }

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
      });

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
      const invoicedLiftingIds = new Set(
        c.invoices.map((inv) => inv.liftingId).filter(Boolean)
      );
      const uninvoicedLiftings = c.cementLiftings.filter(
        (l) => l.invoices.length === 0 && !invoicedLiftingIds.has(l.id)
      );
      const cementDeliveredNotInvoiced = uninvoicedLiftings.reduce(
        (sum, l) => sum + Number(l.factoryWeight) * Number(l.purchase.unitPrice),
        0
      );
      const cementDeliveredNotInvoicedCount = uninvoicedLiftings.length;

      // Aggregate deliveries that haven't been invoiced yet
      const customerAggDeliveries = aggByCustomer.get(c.id) || [];
      const uninvoicedAggDeliveries = customerAggDeliveries.filter(
        (d) => !invoicedAggDeliveryIds.has(d.id)
      );
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
        recentPayments: c.payments.slice(0, 5),
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
